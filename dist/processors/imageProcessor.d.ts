import { PuppeteerService } from '../services/puppeteerService';
import { ImageService } from '../services/imageService';
import { LoraService } from '../services/loraService';
import { StatusService } from '../services/statusService';
import { Queue } from '../services/queueService';
import { Config } from '../config/index';
import { Page } from 'rebrowser-puppeteer-core';
interface Job {
    prompt: string;
    loraName: string | null;
    imageId: string;
    emitter: any;
}
export declare class ImageProcessor {
    private puppeteerService;
    private imageService;
    private loraService;
    private statusService;
    private config;
    private imageQueue;
    private oldLoraName;
    constructor(puppeteerService: PuppeteerService, imageService: ImageService, loraService: LoraService, statusService: StatusService, config: Config, imageQueue: Queue);
    processImage(job: Job, page: Page): Promise<void>;
    private handleLora;
    private handleImageResult;
}
export default ImageProcessor;
