"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRoutes = void 0;
const setupRoutes = (app, config, puppeteerService, imageService, loraService, statusService, imageQueue, loraSearchQueue, events) => {
    const apiKeyCheck = (req, res, next) => {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey || apiKey !== config.API_KEY) {
            res.status(401).send({ error: 'Unauthorized: Missing or invalid API key' });
            return;
        }
        next();
    };
    app.get('/health', (req, res) => {
        res.send({ status: 'OK' });
    });
    app.get('/status/:imageId', (req, res) => {
        const { imageId } = req.params;
        const status = statusService.getImageStatus(imageId);
        res.send(status);
    });
    app.get('/search-loras', async (req, res) => {
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
        }, puppeteerService.loraSearchPage);
    });
    app.get('/generateImage', async (req, res) => {
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
        const job = {
            prompt,
            loraName: typeof loraName === 'string' ? loraName : undefined,
            imageId,
            res,
            emitter: events
        };
        imageQueue.enqueue({ ...job, id: imageId, data: { prompt } }, puppeteerService.generationPage);
        res.send({
            success: true,
            imageId,
            imageUrl: `${config.API_URL}/${imageId}.jpg`,
            statusUrl: `${config.API_URL}/status/${imageId}`,
        });
    });
    app.get("/quota", async (_req, res) => {
        const quota = await puppeteerService.getGenerationPage()?.evaluate(() => {
            const element = document.querySelector("body > div.MuiModal-root.css-1sucic7 > div.flex.outline-none.flex-col.items-center.gap-4.w-full.md\\:w-\\[400px\\].min-h-\\[200px\\].absolute.bottom-0.md\\:bottom-auto.md\\:top-1\\/2.md\\:left-1\\/2.md\\:-translate-x-1\\/2.md\\:-translate-y-1\\/2.px-6.py-6.rounded-t-3xl.md\\:rounded-3xl.shadow-lg.bg-white.dark\\:bg-neutral-800.max-h-screen.overflow-y-auto.overflow-x-hidden.pb-\\[var\\(--is-mobile-pb\\)\\].md\\:pb-\\[var\\(--is-mobile-pb-md\\)\\] > div.-mt-2.flex.w-full.items-center.justify-center.gap-2 > a > div.flex.items-center.gap-2 > span");
            return element?.textContent || null;
        });
        res.send(quota);
    });
};
exports.setupRoutes = setupRoutes;
exports.default = exports.setupRoutes;
