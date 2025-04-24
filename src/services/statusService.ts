export class StatusService {
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
    return this.imageStatuses[imageId];
  }
}

export default StatusService;
