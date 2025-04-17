import { Config } from '../config';
export declare class ImageService {
    private cleanupIntervalId;
    private readonly config;
    constructor(config: Config);
    generateImageId(): string;
    downloadImage(url: string, imageId: string): Promise<string>;
    saveBase64Image(base64Data: string, imageId: string, isFinal?: boolean): Promise<string>;
    private cleanupOldImages;
    startCleanupInterval(): void;
    stopCleanupInterval(): void;
    runCleanupOnce(): void;
}
export default ImageService;
