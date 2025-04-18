// filepath: weights-selenium/src/services/statusService.ts
export class StatusService {
    public imageStatuses: { [key: string]: { status: string; lastModifiedDate?: number, error: string | null } } = {};

    public updateImageStatus(imageId: string, status: string, errorMessage?: string): void {
        this.imageStatuses[imageId] = {
            status,
            lastModifiedDate: Date.now(),
            error: null
        };

        if(errorMessage) {
            this.imageStatuses[imageId].status = 'FAILED';
            this.imageStatuses[imageId].error= errorMessage;
        }

        if (errorMessage) {
            console.error(`Error for image ${imageId}: ${errorMessage}`);
        }
    }

    public getImageStatus(imageId: string): { status: string; lastModifiedDate?: number } | undefined {
        return this.imageStatuses[imageId];
    }
}

export default StatusService;