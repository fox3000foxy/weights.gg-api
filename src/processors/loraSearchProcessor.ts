// filepath: weights-selenium/src/processors/loraSearchProcessor.ts
import { Page } from 'rebrowser-puppeteer-core';
import { LoraResult, LoraService } from '../services/loraService';
import { Queue } from '../services/queueService';
import { Response } from 'express';

interface LoraSearchJob {
    query: string;
    res: Response;
}

export class LoraSearchProcessor {
    private loraService: LoraService;

    constructor(loraService: LoraService) {
        this.loraService = loraService;
    }

    async processLoraSearch(job: LoraSearchJob, loraSearchPage: Page) {
        const { query, res } = job;

        try {
            if (this.loraService.loraSearchCache.has(query)) {
                console.log(`Using cached result for Lora search: ${query}`);
                const cachedResult = this.loraService.loraSearchCache.get(query);
                res.send(cachedResult);
                return;
            }

            const searchResult = await this.performLoraSearch(query, loraSearchPage);
            res.send(searchResult);
        } catch (error) {
            console.error("Error during Lora search:", error);
            res.send([]);
        }
    }

    private async performLoraSearch(query: string, loraSearchPage: Page) {
        let timeoutId: NodeJS.Timeout | null = null;
        const timeoutPromise = new Promise<unknown>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error("Lora search timed out"));
            }, 5000); // 5 seconds timeout
        });

        try {
            const result = await Promise.race([
                this.loraService.searchLoras(query, loraSearchPage),
                timeoutPromise
            ]);

            if ((result as unknown[])?.length !== 0) {
                this.loraService.loraSearchCache.set(query, result as LoraResult[]);
                this.loraService.saveLoraCache(); // Save the cache after updating it
            }

            if (timeoutId) clearTimeout(timeoutId);
            return result;
        } catch (error) {
            if (timeoutId) clearTimeout(timeoutId);
            throw error;
        }
    }
}

export default LoraSearchProcessor;
export { LoraSearchJob };