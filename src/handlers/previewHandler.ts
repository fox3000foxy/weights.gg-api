import { EventEmitter } from "events";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";
import { IImageService } from "../services/imageService";
import { EVENT_TYPES, ImageGenerationResult } from "../types";

@injectable()
export class PreviewHandler {
  constructor(
    @inject(TYPES.ImageService) private imageService: IImageService,
    @inject(TYPES.EventEmitter) private emitter: EventEmitter,
  ) {}

  handlePreviewUpdate = async (data: ImageGenerationResult) => {
    if (!data || !data.url || !data.imageId) {
      console.error("Invalid data received:", data);
      return;
    }

    this.emitter.emit(EVENT_TYPES.PREVIEW_UPDATE, data);

    try {
      const base64Data = data.url.replace(
        /^data:image\/(png|jpeg|jpg);base64,/,
        "",
      );
      if (data.url.startsWith("data:image")) {
        await this.imageService.saveBase64Image(base64Data, data.imageId);
      } else {
        await this.imageService.downloadImage(data.url, data.imageId);
      }

      this.emitter.emit(EVENT_TYPES.STATUS_UPDATE, {
        imageId: data.imageId,
        status: "PENDING",
        lastModifiedDate: new Date().toISOString(),
      });
    } catch (error: Error | unknown) {
      console.error("Error processing preview:", error);

      if (error instanceof Error) {
        this.emitter.emit(EVENT_TYPES.STATUS_UPDATE, {
          imageId: data.imageId,
          status: "FAILED",
          error: error.message,
        });
      }
    }
  };
}
