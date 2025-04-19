/// <reference types="node" />
import { Page } from "rebrowser-puppeteer-core";
import { EventEmitter } from "events";
import { ImageGenerationResult } from "types";
export declare function generateImage(prompt: string, page: Page, emitter: EventEmitter, imageId: string): Promise<ImageGenerationResult>;
export default generateImage;
