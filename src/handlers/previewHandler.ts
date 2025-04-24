import { EventEmitter } from "events";
import { ImageService } from "../services/imageService";
import { EVENT_TYPES, ImageGenerationResult } from "../types";

export class PreviewHandler {
  constructor(
    private imageService: ImageService,
    private emitter: EventEmitter,
  ) {}

  handlePreviewUpdate = async (data: ImageGenerationResult) => {
    if (!data || !data.url || !data.imageId) {
      console.error("Invalid data received:", data);
      return;
    }

    // Emit immediately to confirm we received the data
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    const boundFunc = func.bind(this);

    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => boundFunc(...args), delay);
    };
  }
}
