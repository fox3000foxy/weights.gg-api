import { Express, Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'events';
import { Config } from '../config';
import { PuppeteerService } from './puppeteerService';
import { ImageService } from './imageService';
import { LoraService } from './loraService';
import { StatusService } from './statusService';
import { Queue, QueueItem } from './queueService';
import { Page } from 'rebrowser-puppeteer-core';

interface GenerateImageJob {
    prompt: string;
    loraName?: string;
    imageId: string;
    res: Response;
    emitter: EventEmitter;
}

interface SearchLoraJob {
    query: string;
    res: Response;
    searchId: string;
    id: string;
    data: any;
}

export const setupRoutes = (
    app: Express,
    config: Config,
    puppeteerService: PuppeteerService,
    imageService: ImageService,
    loraService: LoraService,
    statusService: StatusService,
    imageQueue: Queue,
    loraSearchQueue: Queue,
    events: EventEmitter
): void => {
    const apiKeyCheck = (req: Request, res: Response, next: NextFunction): void => {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey || apiKey !== config.API_KEY) {
            res.status(401).send({ error: 'Unauthorized: Missing or invalid API key' });
            return;
        }
        next();
    };

    app.use(apiKeyCheck);

    app.get('/health', (req: Request, res: Response) => {
        res.send({ status: 'OK' });
    });

    app.get('/status/:imageId', (req: Request, res: Response) => {
        const { imageId } = req.params;
        const status = statusService.getImageStatus(imageId);
        res.send(status);
    });

    app.get('/search-loras', async (req: Request, res: Response) => {
        const { query } = req.query;
        if (!query || typeof query !== 'string') {
            res.status(400).send({ error: "Query parameter is required." });
            return;
        }

        const loraName = decodeURIComponent(query);
        const searchId = imageService.generateImageId();
        loraSearchQueue.enqueue({ 
            query: loraName, 
            res, 
            searchId,
            id: searchId,
            data: { query: loraName }
        } as SearchLoraJob, puppeteerService.loraSearchPage as Page);
    });

    app.get('/generateImage', async (req: Request, res: Response) => {
        if (imageQueue.queue.length >= config.MAX_QUEUE_SIZE) {
            res.status(429).send({ error: "Server is busy. Please try again later." });
            return;
        }

        const { prompt, loraName } = req.query;

        if (!prompt || typeof prompt !== 'string') {
            res.status(400).send({ error: "Prompt is required." });
            return;
        }

        const imageId = imageService.generateImageId();
        const job: GenerateImageJob = { 
            prompt, 
            loraName: typeof loraName === 'string' ? loraName : undefined, 
            imageId, 
            res, 
            emitter: events
        };

        imageQueue.enqueue({ ...job, id: imageId, data: { prompt } }, puppeteerService.generationPage as Page);
        res.send({
            success: true,
            imageId,
            imageUrl: `${config.API_URL}/${imageId}.jpg`,
            statusUrl: `${config.API_URL}/status/${imageId}`,
        });
    });

    app.get("/quota", async (_req: Request, res: Response) => {
        const quota = await puppeteerService.getGenerationPage()?.evaluate(() => {
            const element = document.querySelector("body > div.MuiModal-root.css-1sucic7 > div.flex.outline-none.flex-col.items-center.gap-4.w-full.md\\:w-\\[400px\\].min-h-\\[200px\\].absolute.bottom-0.md\\:bottom-auto.md\\:top-1\\/2.md\\:left-1\\/2.md\\:-translate-x-1\\/2.md\\:-translate-y-1\\/2.px-6.py-6.rounded-t-3xl.md\\:rounded-3xl.shadow-lg.bg-white.dark\\:bg-neutral-800.max-h-screen.overflow-y-auto.overflow-x-hidden.pb-\\[var\\(--is-mobile-pb\\)\\].md\\:pb-\\[var\\(--is-mobile-pb-md\\)\\] > div.-mt-2.flex.w-full.items-center.justify-center.gap-2 > a > div.flex.items-center.gap-2 > span");
            return element?.textContent || null;
        });
        res.send(quota);
    });
};

export default setupRoutes;