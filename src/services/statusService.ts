import { injectable } from "inversify";
import { ImageStatus } from "types";

export interface IStatusService {
  imageStatuses: Record<string, ImageStatus>;
  updateImageStatus(
    imageId: string,
    status: string,
    errorMessage?: string | null,
  ): void;
  getImageStatus(imageId: string): ImageStatus;
}

@injectable()
export class StatusService implements IStatusService {
  public imageStatuses: Record<string, ImageStatus> = {};

  public updateImageStatus(
    imageId: string,
    status: string,
    errorMessage: string | null = null,
  ): void {
    this.imageStatuses[imageId] = {
      status,
      lastModifiedDate: Date.now(),
      error: status === "FAILED" ? errorMessage || "No error description provided" : null,
    };

    if (status === "FAILED" && errorMessage) {
      console.error(`Error for image ${imageId}: ${errorMessage}`);
    }
  }

  public getImageStatus(imageId: string): ImageStatus {
    return (
      this.imageStatuses[imageId] || {
        status: "NOT_FOUND",
        lastModifiedDate: undefined,
        error: null,
      }
    );
  }
}

export default StatusService;
