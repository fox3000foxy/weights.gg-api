import { injectable } from "inversify";

export interface IStatusService {
  imageStatuses: {
    [key: string]: {
      status: string;
      lastModifiedDate?: number;
      error: string | null;
    };
  };
  updateImageStatus(
    imageId: string,
    status: string,
    errorMessage?: string | null,
  ): void;
  getImageStatus(
    imageId: string,
  ):
    | { status: string; lastModifiedDate?: number; error: string | null }
    | undefined;
}

@injectable()
export class StatusService implements IStatusService {
  public imageStatuses: {
    [key: string]: {
      status: string;
      lastModifiedDate?: number;
      error: string | null;
    };
  } = {};

  public updateImageStatus(
    imageId: string,
    status: string,
    errorMessage?: string | null,
  ): void {
    this.imageStatuses[imageId] = {
      status,
      lastModifiedDate: Date.now(),
      error:
        status == "FAILED"
          ? errorMessage || "No error description provided"
          : null,
    };

    if (errorMessage) {
      console.error(`Error for image ${imageId}: ${errorMessage}`);
    }
  }

  public getImageStatus(
    imageId: string,
  ):
    | { status: string; lastModifiedDate?: number; error: string | null }
    | undefined {
    return this.imageStatuses[imageId] || {status: "NOT_FOUND", error: null};
  }
}

export default StatusService;
