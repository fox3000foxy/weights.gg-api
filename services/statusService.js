// --- statusService.js ---
class StatusService {
    constructor() {
        this.imageStatuses = {};
    }

    updateImageStatus(imageId, status, error = null) {
        this.imageStatuses[imageId] = {
            ...this.imageStatuses[imageId],
            status,
            ...(error ? { error } : {}),
        };
    }

    getImageStatus(imageId) {
        return this.imageStatuses[imageId] || { status: 'NOT_FOUND' };
    }
}

module.exports = StatusService;