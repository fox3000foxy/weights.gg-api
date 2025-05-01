import { inject, injectable } from "inversify";
import { TYPES } from "../types";
import { IPuppeteerService } from "../services/puppeteerService";
import { IImageService } from "../services/imageService";
import { ILoraService } from "../services/loraService";
import { IStatusService } from "../services/statusService";
import { IImageQueue } from "../services/queueService";
import { Config } from "../config";
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

export interface IImageProcessor {
  processImage(job: Job, page: Page): Promise<void>;
}

@injectable()
export class ImageProcessor implements IImageProcessor {
  private oldLoraName: string | null = null;
  private oldLoraPage: Page | null = null; // Track the page used for last Lora
  private retryCount = new Map<string, number>();
  private maxRetries = 3;

  constructor(
    @inject(TYPES.PuppeteerService) private puppeteerService: IPuppeteerService,
    @inject(TYPES.ImageService) private imageService: IImageService,
    @inject(TYPES.LoraService) private loraService: ILoraService,
    @inject(TYPES.StatusService) private statusService: IStatusService,
    @inject(TYPES.Config) private config: Config,
    @inject(TYPES.ImageQueue) private imageQueue: IImageQueue,
  ) {}

  async processImage(job: Job, page: Page): Promise<void> {
    const { imageId } = job;

    if (!page) {
      console.error("Page is null, cannot generate image.");
      this.statusService.updateImageStatus(imageId, "FAILED", "Page is null");
      return;
    }

    try {
      this.statusService.updateImageStatus(imageId, "STARTING");

      await this.ensurePageIsUsable(page);
      await this.handleLora(job.loraName, page, job);

      const result = await generateImage(
        decodeURIComponent(job.prompt),
        page,
        imageId,
      );
      await this.handleImageResult(result, imageId);

      this.retryCount.delete(imageId); // Reset retry counter on success
    } catch (error: unknown) {
      await this.handleImageError(error, job, page);
    }
  }

  private async ensurePageIsUsable(page: Page): Promise<void> {
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
  }

  private async handleLora(
    loraName: string | null,
    page: Page,
    job: Job,
  ): Promise<void> {
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
          this.imageQueue.enqueue({
            data: { query: null },
            id: job.imageId,
            job: {
              prompt: job.prompt,
              loraName: null,
              imageId: job.imageId,
              emitter: job.emitter,
            },
          });
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
  ): Promise<void> {
    if (result.error) {
      console.error("Error generating image:", result.error);
      this.statusService.updateImageStatus(imageId, "FAILED", result.error);
      await this.restartPageAndInit(
        this.puppeteerService.generationPage as Page,
      );
      return;
    }

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
      this.statusService.updateImageStatus(imageId, "COMPLETED");
    } catch (error: unknown) {
      console.error("Error handling final image:", error);
      this.statusService.updateImageStatus(
        imageId,
        "FAILED",
        (error as Error).message,
      );
    }
  }

  private async handleImageError(error: unknown, job: Job, page: Page): Promise<void> {
    const { imageId } = job;
    const retries = this.retryCount.get(imageId) || 0;

    console.error("Error generating image:", error);

    if (retries < this.maxRetries) {
      console.log(
        `Retrying job ${imageId}, attempt ${retries + 1}/${this.maxRetries}`,
      );
      this.retryCount.set(imageId, retries + 1);

      await new Promise((r) => setTimeout(r, 2000)); // Wait before retrying

      await this.restartPageAndInit(page);
      return this.processImage(job, page);
    } else {
      this.statusService.updateImageStatus(
        imageId,
        "FAILED",
        `Failed after ${this.maxRetries} attempts: ${(error as Error).message}`,
      );
      this.retryCount.delete(imageId);
    }
  }

  private async restartPageAndInit(page: Page): Promise<void> {
    this.puppeteerService.generationPage =
      await this.puppeteerService.restartPage(page);
    await this.puppeteerService.onStart(
      this.puppeteerService.generationPage,
      this.config.WEIGHTS_GG_COOKIE,
    );
  }
}
