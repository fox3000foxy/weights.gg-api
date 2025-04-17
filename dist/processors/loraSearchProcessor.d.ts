import { Page } from 'rebrowser-puppeteer-core';
import { LoraService } from '../services/loraService';
import { Response } from 'express';
interface LoraSearchJob {
    query: string;
    res: Response;
}
export declare class LoraSearchProcessor {
    private loraService;
    constructor(loraService: LoraService);
    processLoraSearch(job: LoraSearchJob, loraSearchPage: Page): Promise<void>;
    private performLoraSearch;
}
export default LoraSearchProcessor;
export { LoraSearchJob };
