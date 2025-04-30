import { PuppeteerService } from "../services/puppeteerService";
import { ImageService } from "../services/imageService";
import { LoraService } from "../services/loraService";
import { StatusService } from "../services/statusService";
import { ImageQueue } from "../services/queueService";
import { Config } from "../config/index";
import { generateImage } from "../services/imageGeneration";
import { Page } from "rebrowser-puppeteer-core";
import { ImageGenerationResult } from "types";
import { EventEmitter } from "events";

interface Job {
  prompt: string;
  loraName: string | null;
  imageId: string;
  emitter: EventEmitter;
}

export class ImageProcessor {
  private oldLoraName: string | null = null;
  private oldLoraPage: Page | null = null; // Track the page used for last Lora
  private retryCount = new Map<string, number>();
  private maxRetries = 3;

  constructor(
    private puppeteerService: PuppeteerService,
    private imageService: ImageService,
    private loraService: LoraService,
    private statusService: StatusService,
    private config: Config,
    private imageQueue: ImageQueue,
  ) {}

  async processImage(job: Job, page: Page): Promise<void> {
    const { prompt, loraName, imageId } = job;
    const retries = this.retryCount.get(imageId) || 0;

    if (!page) {
      console.error("Page is null, cannot generate image.");
      this.statusService.updateImageStatus(imageId, "FAILED", "Page is null");
      return;
    }

    try {
      this.statusService.updateImageStatus(imageId, "STARTING");

      // Vérifier si la page est utilisable, sinon la redémarrer
      const isPageUsable = await page
        .evaluate(() => {
          return (
            document.readyState === "complete" &&
            !document.querySelector(".error-boundary") &&
            !document.querySelector(".Toastify__toast--error")
          );
        })
        .catch(() => false);

      if (!isPageUsable) {
        console.log("Page is in an unstable state, restarting...");
        await this.restartPageAndInit(page);
      }

      await this.handleLora(loraName, page, job);
      const result = await generateImage(
        decodeURIComponent(prompt),
        page,
        imageId,
      );
      await this.handleImageResult(result, imageId);

      // Réinitialiser le compteur de retry en cas de succès
      this.retryCount.delete(imageId);
    } catch (error: Error | unknown) {
      if (error instanceof Error) {
        console.error("Error generating image:", error);

        // Implémenter un système de retry
        if (retries < this.maxRetries) {
          console.log(
            `Retrying job ${imageId}, attempt ${retries + 1}/${this.maxRetries}`,
          );
          this.retryCount.set(imageId, retries + 1);

          // Attendre avant de réessayer
          await new Promise((r) => setTimeout(r, 2000));

          // Redémarrer la page et réessayer
          await this.restartPageAndInit(page);
          return this.processImage(job, page);
        } else {
          this.statusService.updateImageStatus(
            imageId,
            "FAILED",
            `Failed after ${this.maxRetries} attempts: ${error.message}`,
          );
          this.retryCount.delete(imageId);
        }
      }
    }
  }

  private async handleLora(loraName: string | null, page: Page, job: Job) {
    // If the page has changed since last Lora, reset oldLoraName and oldLoraPage
    if (this.oldLoraPage !== page) {
      this.oldLoraName = null;
      this.oldLoraPage = page;
    }

    if (loraName) {
      if (this.oldLoraName !== loraName) {
        if (this.oldLoraName) await this.loraService.removeLora(page);
        const loraAdded = await this.loraService.addLora(loraName, page);
        if (!loraAdded) {
          console.error("Failed to add Lora, requeuing job.");
          this.imageQueue.enqueue(
            {
              data: { query: null },
              id: job.imageId,
              job: {
                prompt: job.prompt,
                loraName: null,
                imageId: job.imageId,
                emitter: job.emitter,
              },
            },
            page,
          ); // Re-add the job to the front of the queue
          return;
        }
        this.oldLoraName = loraName;
        this.oldLoraPage = page;
      }
    } else if (this.oldLoraName) {
      await this.loraService.removeLora(page);
      this.oldLoraName = null;
      this.oldLoraPage = page;
    }
  }

  private async handleImageResult(
    result: ImageGenerationResult,
    imageId: string,
  ) {
    if (result.error) {
      console.error("Error generating image:", result.error);
      this.statusService.updateImageStatus(imageId, "FAILED", result.error);
      await this.restartPageAndInit(
        this.puppeteerService.generationPage as Page,
      );
    } else {
      try {
        if (!result.url) {
          throw new Error("No URL returned from image generation");
        }
        const base64Data = result.url.replace(
          /^data:image\/(png|jpeg|jpg);base64,/,
          "",
        );
        if (result.url.startsWith("data:image")) {
          await this.imageService.saveBase64Image(base64Data, imageId, true);
        } else {
          await this.imageService.downloadImage(result.url, imageId);
        }
      } catch (error: Error | unknown) {
        if (error instanceof Error) {
          console.error("Error handling final image:", error);
          this.statusService.updateImageStatus(
            imageId,
            "FAILED",
            error.message,
          );
        }
        return;
      }
      this.statusService.updateImageStatus(imageId, "COMPLETED");
    }
  }

  private async restartPageAndInit(page: Page) {
    this.puppeteerService.generationPage =
      await this.puppeteerService.restartPage(page);
    await this.puppeteerService.onStart(
      this.puppeteerService.generationPage,
      this.config.WEIGHTS_GG_COOKIE,
    );
  }
}

module.exports = ImageProcessor;
export default ImageProcessor;
