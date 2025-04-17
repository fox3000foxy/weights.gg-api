"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageProcessor = void 0;
const imageGeneration_1 = require("../services/imageGeneration");
class ImageProcessor {
    constructor(puppeteerService, imageService, loraService, statusService, config, imageQueue) {
        this.puppeteerService = puppeteerService;
        this.imageService = imageService;
        this.loraService = loraService;
        this.statusService = statusService;
        this.config = config;
        this.imageQueue = imageQueue;
        this.oldLoraName = null;
    }
    async processImage(job, page) {
        const { prompt, loraName, imageId, emitter } = job;
        if (!page) {
            console.error("Page is null, cannot generate image.");
            this.statusService.updateImageStatus(imageId, 'FAILED', 'Page is null');
            return;
        }
        try {
            this.statusService.updateImageStatus(imageId, 'STARTING');
            await this.handleLora(loraName, page, job);
            const result = await (0, imageGeneration_1.generateImage)(decodeURIComponent(prompt), page, emitter, imageId);
            await this.handleImageResult(result, imageId);
        }
        catch (error) {
            console.error("Error generating image:", error);
            this.statusService.updateImageStatus(imageId, 'FAILED', error.message);
            console.log("Refreshing the page after an error");
            this.puppeteerService.generationPage = await this.puppeteerService.restartPage(page, this.config.WEIGHTS_GG_COOKIE);
            await this.puppeteerService.onStart(this.puppeteerService.generationPage, this.config.WEIGHTS_GG_COOKIE);
        }
    }
    async handleLora(loraName, page, job) {
        if (loraName) {
            if (this.oldLoraName !== loraName) {
                if (this.oldLoraName)
                    await this.loraService.removeLora(page);
                const loraAdded = await this.loraService.addLora(loraName, page);
                if (!loraAdded) {
                    console.log("Failed to add Lora, requeuing job.");
                    this.imageQueue.enqueue({ data: { query: null }, id: job.imageId }, page); // Re-add the job to the front of the queue
                    return;
                }
                this.oldLoraName = loraName;
            }
        }
        else if (this.oldLoraName) {
            await this.loraService.removeLora(page);
            this.oldLoraName = null;
        }
    }
    async handleImageResult(result, imageId) {
        if (result.error) {
            console.error("Error generating image:", result.error);
            this.statusService.updateImageStatus(imageId, 'FAILED', result.error);
            this.puppeteerService.generationPage = await this.puppeteerService.restartPage(this.puppeteerService.generationPage, this.config.WEIGHTS_GG_COOKIE);
            await this.puppeteerService.onStart(this.puppeteerService.generationPage, this.config.WEIGHTS_GG_COOKIE);
        }
        else {
            console.log("Final image URL:", result.url);
            try {
                const base64Data = result.url.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
                const filePath = result.url.startsWith('data:image')
                    ? await this.imageService.saveBase64Image(base64Data, imageId, true)
                    : await this.imageService.downloadImage(result.url, imageId);
                console.log(`Final image saved to ${filePath}`);
            }
            catch (error) {
                console.error("Error handling final image:", error);
                this.statusService.updateImageStatus(imageId, 'FAILED', error.message);
            }
            this.statusService.updateImageStatus(imageId, 'COMPLETED');
        }
    }
}
exports.ImageProcessor = ImageProcessor;
module.exports = ImageProcessor;
exports.default = ImageProcessor;
