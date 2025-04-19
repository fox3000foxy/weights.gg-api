// filepath: weights-selenium/src/processors/imageProcessor.ts
import { PuppeteerService } from "../services/puppeteerService";
import { ImageService } from "../services/imageService";
import { LoraService } from "../services/loraService";
import { StatusService } from "../services/statusService";
import { Queue } from "../services/queueService";
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

  constructor(
    private puppeteerService: PuppeteerService,
    private imageService: ImageService,
    private loraService: LoraService,
    private statusService: StatusService,
    private config: Config,
    private imageQueue: Queue,
  ) {}

  async processImage(job: Job, page: Page) {
    const { prompt, loraName, imageId, emitter } = job;

    if (!page) {
      console.error("Page is null, cannot generate image.");
      this.statusService.updateImageStatus(imageId, "FAILED", "Page is null");
      return;
    }

    try {
      this.statusService.updateImageStatus(imageId, "STARTING");
      await this.handleLora(loraName, page, job);
      const result = await generateImage(
        decodeURIComponent(prompt),
        page,
        emitter,
        imageId,
      );
      await this.handleImageResult(result, imageId);
    } catch (error: Error | unknown) {
      if (error instanceof Error) {
        console.error("Error generating image:", error);
        this.statusService.updateImageStatus(imageId, "FAILED", error.message);
        console.log("Refreshing the page after an error");
        this.puppeteerService.generationPage =
          await this.puppeteerService.restartPage(page);
        await this.puppeteerService.onStart(
          this.puppeteerService.generationPage,
          this.config.WEIGHTS_GG_COOKIE,
        );
      }
    }
  }

  private async handleLora(loraName: string | null, page: Page, job: Job) {
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
      }
    } else if (this.oldLoraName) {
      await this.loraService.removeLora(page);
      this.oldLoraName = null;
    }
  }

  private async handleImageResult(
    result: ImageGenerationResult,
    imageId: string,
  ) {
    if (result.error) {
      console.error("Error generating image:", result.error);
      this.statusService.updateImageStatus(imageId, "FAILED", result.error);
      this.puppeteerService.generationPage =
        await this.puppeteerService.restartPage(
          this.puppeteerService.generationPage as Page,
        );
      await this.puppeteerService.onStart(
        this.puppeteerService.generationPage,
        this.config.WEIGHTS_GG_COOKIE,
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
}

module.exports = ImageProcessor;
export default ImageProcessor;
