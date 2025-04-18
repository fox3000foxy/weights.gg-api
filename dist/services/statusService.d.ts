export declare class StatusService {
    imageStatuses: {
        [key: string]: {
            status: string;
            lastModifiedDate?: number;
            error: string | null;
        };
    };
    updateImageStatus(imageId: string, status: string, errorMessage?: string | null): void;
    getImageStatus(imageId: string): {
        status: string;
        lastModifiedDate?: number;
    } | undefined;
}
export default StatusService;
