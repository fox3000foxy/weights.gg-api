export declare class StatusService {
    imageStatuses: {
        [key: string]: {
            status: string;
            lastModifiedDate?: number;
        };
    };
    updateImageStatus(imageId: string, status: string, errorMessage?: string): void;
    getImageStatus(imageId: string): {
        status: string;
        lastModifiedDate?: number;
    } | undefined;
}
export default StatusService;
