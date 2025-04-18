"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusService = void 0;
// filepath: weights-selenium/src/services/statusService.ts
class StatusService {
    constructor() {
        this.imageStatuses = {};
    }
    updateImageStatus(imageId, status, errorMessage) {
        this.imageStatuses[imageId] = {
            status,
            lastModifiedDate: Date.now(),
            error: null
        };
        if (errorMessage) {
            this.imageStatuses[imageId].status = 'FAILED';
            this.imageStatuses[imageId].error = errorMessage;
        }
        if (errorMessage) {
            console.error(`Error for image ${imageId}: ${errorMessage}`);
        }
    }
    getImageStatus(imageId) {
        return this.imageStatuses[imageId];
    }
}
exports.StatusService = StatusService;
exports.default = StatusService;
