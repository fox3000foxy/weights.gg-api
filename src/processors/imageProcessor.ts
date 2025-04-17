// filepath: weights-selenium/src/processors/imageProcessor.ts
import { PuppeteerService } from '../services/puppeteerService';
import { ImageService } from '../services/imageService';
import { LoraService } from '../services/loraService';
import { StatusService } from '../services/statusService';
import { Queue, QueueItem } from '../services/queueService';
import { Config } from '../config/index';
import { generateImage } from '../services/imageGeneration';
import { Page } from 'rebrowser-puppeteer-core';

interface Job {
    prompt: string;
    loraName: string | null;
    imageId: string;
    emitter: any;
}

export class ImageProcessor {
    private oldLoraName: string | null = null;

    constructor(
        private puppeteerService: PuppeteerService,
        private imageService: ImageService,
        private loraService: LoraService,
        private statusService: StatusService,
        private config: Config,
        private imageQueue: Queue
    ) {}

    async processImage(job: Job, page: Page) {
        const { prompt, loraName, imageId, emitter } = job;

        if (!page) {
            console.error("Page is null, cannot generate image.");
            this.statusService.updateImageStatus(imageId, 'FAILED', 'Page is null');
            return;
        }

        try {
            this.statusService.updateImageStatus(imageId, 'STARTING');
            await this.handleLora(loraName, page, job);
            const result = await generateImage(decodeURIComponent(prompt), page, emitter, imageId);
            await this.handleImageResult(result, imageId);
        } catch (error: any) {
            console.error("Error generating image:", error);
            this.statusService.updateImageStatus(imageId, 'FAILED', error.message);
            console.log("Refreshing the page after an error");
            this.puppeteerService.generationPage = await this.puppeteerService.restartPage(page, this.config.WEIGHTS_GG_COOKIE);
            await this.puppeteerService.onStart(this.puppeteerService.generationPage, this.config.WEIGHTS_GG_COOKIE);
        }
    }

    private async handleLora(loraName: string | null, page: any, job: Job) {
        if (loraName) {
            if (this.oldLoraName !== loraName) {
                if (this.oldLoraName) await this.loraService.removeLora(page);
                const loraAdded = await this.loraService.addLora(loraName, page);
                if (!loraAdded) {
                    console.log("Failed to add Lora, requeuing job.");
                    this.imageQueue.enqueue({ data: {query: null}, id: job.imageId}, page); // Re-add the job to the front of the queue
                    return;
                }
                this.oldLoraName = loraName;
            }
        } else if (this.oldLoraName) {
            await this.loraService.removeLora(page);
            this.oldLoraName = null;
        }
    }

    private async handleImageResult(result: any, imageId: string) {
        if (result.error) {
            console.error("Error generating image:", result.error);
            this.statusService.updateImageStatus(imageId, 'FAILED', result.error);
            this.puppeteerService.generationPage = await this.puppeteerService.restartPage(this.puppeteerService.generationPage as Page, this.config.WEIGHTS_GG_COOKIE);
            await this.puppeteerService.onStart(this.puppeteerService.generationPage, this.config.WEIGHTS_GG_COOKIE);
        } else {
            console.log("Final image URL:", result.url);
            try {
                const base64Data = result.url.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
                const filePath = result.url.startsWith('data:image')
                    ? await this.imageService.saveBase64Image(base64Data, imageId, true)
                    : await this.imageService.downloadImage(result.url, imageId);
                console.log(`Final image saved to ${filePath}`);
            } catch (error: any) {
                console.error("Error handling final image:", error);
                this.statusService.updateImageStatus(imageId, 'FAILED', error.message);
            }
            this.statusService.updateImageStatus(imageId, 'COMPLETED');
        }
    }
}

module.exports = ImageProcessor;
export default ImageProcessor;