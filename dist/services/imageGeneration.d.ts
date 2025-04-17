/// <reference types="node" />
import { Page } from 'rebrowser-puppeteer-core';
import { EventEmitter } from 'events';
interface ImageGenerationResult {
    url?: string;
    imageId?: string;
    error?: string;
}
export declare function generateImage(prompt: string, page: Page, emitter: EventEmitter, imageId: string): Promise<ImageGenerationResult>;
export default generateImage;
