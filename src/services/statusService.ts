// filepath: weights-selenium/src/services/statusService.ts
export class StatusService {
    public imageStatuses: { [key: string]: { status: string; lastModifiedDate?: number } } = {};

    public updateImageStatus(imageId: string, status: string, errorMessage?: string): void {
        this.imageStatuses[imageId] = {
            status,
            lastModifiedDate: Date.now(),
        };

        if (errorMessage) {
            console.error(`Error for image ${imageId}: ${errorMessage}`);
        }
    }

    public getImageStatus(imageId: string): { status: string; lastModifiedDate?: number } | undefined {
        return this.imageStatuses[imageId];
    }
}

export default StatusService;