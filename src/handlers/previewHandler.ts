import { EventEmitter } from 'events';
import { ImageService } from '../services/imageService';
import { StatusService } from '../services/statusService';
import { EVENT_TYPES } from '../types';

export class PreviewHandler {
    constructor(
        private imageService: ImageService,
        private statusService: StatusService,
        private emitter: EventEmitter
    ) {}

    handlePreviewUpdate = async (data: { url: string; imageId: string }) => {
        
        if (!data || !data.url || !data.imageId) {
            console.error("Invalid data received:", data);
            return;
        }

        // Emit immediately to confirm we received the data
        this.emitter.emit(EVENT_TYPES.PREVIEW_UPDATE, data);

        try {
            const base64Data = data.url.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
            const filePath = data.url.startsWith('data:image')
                ? await this.imageService.saveBase64Image(base64Data, data.imageId)
                : await this.imageService.downloadImage(data.url, data.imageId);
            
            this.emitter.emit(EVENT_TYPES.STATUS_UPDATE, {
                imageId: data.imageId,
                status: 'PENDING',
                lastModifiedDate: new Date().toISOString()
            });
        } catch (error: any) {
            console.error("Error processing preview:", error);
            
            this.emitter.emit(EVENT_TYPES.STATUS_UPDATE, {
                imageId: data.imageId,
                status: 'FAILED',
                error: error.message
            });
        }
    }

    debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
        let timeoutId: NodeJS.Timeout;
        const boundFunc = func.bind(this);
        
        return (...args: Parameters<T>) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => boundFunc(...args), delay);
        };
    }
}