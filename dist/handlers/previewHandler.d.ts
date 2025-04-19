/// <reference types="node" />
import { EventEmitter } from "events";
import { ImageService } from "../services/imageService";
import { StatusService } from "../services/statusService";
import { ImageGenerationResult } from "../types";
export declare class PreviewHandler {
    private imageService;
    private statusService;
    private emitter;
    constructor(imageService: ImageService, statusService: StatusService, emitter: EventEmitter);
    handlePreviewUpdate: (data: ImageGenerationResult) => Promise<void>;
    debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void;
}
