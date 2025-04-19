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
            if (!data || !data.url || !data.imageId) {
                console.error("Invalid data received:", data);
                return;
            }
            // Emit immediately to confirm we received the data
            this.emitter.emit(types_1.EVENT_TYPES.PREVIEW_UPDATE, data);
            try {
                const base64Data = data.url.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
                if (data.url.startsWith("data:image")) {
                    await this.imageService.saveBase64Image(base64Data, data.imageId);
                }
                else {
                    await this.imageService.downloadImage(data.url, data.imageId);
                }
                this.emitter.emit(types_1.EVENT_TYPES.STATUS_UPDATE, {
                    imageId: data.imageId,
                    status: "PENDING",
                    lastModifiedDate: new Date().toISOString(),
                });
            }
            catch (error) {
                console.error("Error processing preview:", error);
                if (error instanceof Error) {
                    this.emitter.emit(types_1.EVENT_TYPES.STATUS_UPDATE, {
                        imageId: data.imageId,
                        status: "FAILED",
                        error: error.message,
                    });
                }
            }
        };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debounce(func, delay) {
        let timeoutId;
        const boundFunc = func.bind(this);
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => boundFunc(...args), delay);
        };
    }
}
exports.PreviewHandler = PreviewHandler;
