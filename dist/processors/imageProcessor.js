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
        this.retryCount = new Map();
        this.maxRetries = 3;
    }
    async processImage(job, page) {
        const { prompt, loraName, imageId, emitter } = job;
        const retries = this.retryCount.get(imageId) || 0;
        if (!page) {
            console.error("Page is null, cannot generate image.");
            this.statusService.updateImageStatus(imageId, "FAILED", "Page is null");
            return;
        }
        try {
            this.statusService.updateImageStatus(imageId, "STARTING");
            // Vérifier si la page est utilisable, sinon la redémarrer
            const isPageUsable = await page
                .evaluate(() => {
                return (document.readyState === "complete" &&
                    !document.querySelector(".error-boundary") &&
                    !document.querySelector(".Toastify__toast--error"));
            })
                .catch(() => false);
            if (!isPageUsable) {
                console.log("Page is in an unstable state, restarting...");
                await this.restartPageAndInit(page);
            }
            await this.handleLora(loraName, page, job);
            const result = await (0, imageGeneration_1.generateImage)(decodeURIComponent(prompt), page, emitter, imageId);
            await this.handleImageResult(result, imageId);
            // Réinitialiser le compteur de retry en cas de succès
            this.retryCount.delete(imageId);
        }
        catch (error) {
            if (error instanceof Error) {
                console.error("Error generating image:", error);
                // Implémenter un système de retry
                if (retries < this.maxRetries) {
                    console.log(`Retrying job ${imageId}, attempt ${retries + 1}/${this.maxRetries}`);
                    this.retryCount.set(imageId, retries + 1);
                    // Attendre avant de réessayer
                    await new Promise((r) => setTimeout(r, 2000));
                    // Redémarrer la page et réessayer
                    await this.restartPageAndInit(page);
                    return this.processImage(job, page);
                }
                else {
                    this.statusService.updateImageStatus(imageId, "FAILED", `Failed after ${this.maxRetries} attempts: ${error.message}`);
                    this.retryCount.delete(imageId);
                }
            }
        }
    }
    async handleLora(loraName, page, job) {
        if (loraName) {
            if (this.oldLoraName !== loraName) {
                if (this.oldLoraName)
                    await this.loraService.removeLora(page);
                const loraAdded = await this.loraService.addLora(loraName, page);
                if (!loraAdded) {
                    console.error("Failed to add Lora, requeuing job.");
                    this.imageQueue.enqueue({
                        data: { query: null },
                        id: job.imageId,
                        job: {
                            prompt: job.prompt,
                            loraName: null,
                            imageId: job.imageId,
                            emitter: job.emitter,
                        },
                    }, page); // Re-add the job to the front of the queue
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
            this.statusService.updateImageStatus(imageId, "FAILED", result.error);
            await this.restartPageAndInit(this.puppeteerService.generationPage);
        }
        else {
            try {
                if (!result.url) {
                    throw new Error("No URL returned from image generation");
                }
                const base64Data = result.url.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
                if (result.url.startsWith("data:image")) {
                    await this.imageService.saveBase64Image(base64Data, imageId, true);
                }
                else {
                    await this.imageService.downloadImage(result.url, imageId);
                }
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error("Error handling final image:", error);
                    this.statusService.updateImageStatus(imageId, "FAILED", error.message);
                }
                return;
            }
            this.statusService.updateImageStatus(imageId, "COMPLETED");
        }
    }
    async restartPageAndInit(page) {
        this.puppeteerService.generationPage =
            await this.puppeteerService.restartPage(page);
        await this.puppeteerService.onStart(this.puppeteerService.generationPage, this.config.WEIGHTS_GG_COOKIE);
    }
}
exports.ImageProcessor = ImageProcessor;
module.exports = ImageProcessor;
exports.default = ImageProcessor;
