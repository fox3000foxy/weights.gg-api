"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviewHandler = void 0;
const types_1 = require("../types");
class PreviewHandler {
    constructor(imageService, statusService, emitter) {
        this.imageService = imageService;
        this.statusService = statusService;
        this.emitter = emitter;
        this.handlePreviewUpdate = async (data) => {
            console.log("Image preview updated"); // Debug log
            if (!data || !data.url || !data.imageId) {
                console.error("Invalid data received:", data);
                return;
            }
            // Emit immediately to confirm we received the data
            this.emitter.emit(types_1.EVENT_TYPES.PREVIEW_UPDATE, data);
            try {
                const base64Data = data.url.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
                const filePath = data.url.startsWith('data:image')
                    ? await this.imageService.saveBase64Image(base64Data, data.imageId)
                    : await this.imageService.downloadImage(data.url, data.imageId);
                console.log(`Image preview saved to ${filePath}`);
                this.emitter.emit(types_1.EVENT_TYPES.STATUS_UPDATE, {
                    imageId: data.imageId,
                    status: 'PENDING',
                    lastModifiedDate: new Date().toISOString()
                });
            }
            catch (error) {
                console.error("Error processing preview:", error);
                this.emitter.emit(types_1.EVENT_TYPES.STATUS_UPDATE, {
                    imageId: data.imageId,
                    status: 'FAILED',
                    error: error.message
                });
            }
        };
    }
    debounce(func, delay) {
        let timeoutId;
        const boundFunc = func.bind(this);
        return (...args) => {
            clearTimeout(timeoutId);
            console.log("Debouncing function call");
            timeoutId = setTimeout(() => boundFunc(...args), delay);
        };
    }
}
exports.PreviewHandler = PreviewHandler;
