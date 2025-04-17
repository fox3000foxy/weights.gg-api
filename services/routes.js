// --- routes.js ---
const setupRoutes = (app, config, puppeteerService, imageService, loraService, statusService, imageQueue, loraSearchQueue, events) => {

    // Middleware to check API key
    const apiKeyCheck = (req, res, next) => {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey || apiKey !== config.API_KEY) {
            return res.status(401).send({ error: 'Unauthorized: Missing or invalid API key' });
        }
        next();
    };

    // app.use('/status', apiKeyCheck);
    // app.use('/search-loras', apiKeyCheck);
    // app.use('/generateImage', apiKeyCheck);
    // app.use('/quota', apiKeyCheck);

    app.get('/health', (req, res) => res.send({ status: 'OK' }));

    app.get('/status/:imageId', (req, res) => {
        const { imageId } = req.params;
        const status = statusService.getImageStatus(imageId);
        res.send(status);
    });

    app.get('/search-loras', async (req, res) => {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send({ error: "Query parameter is required." });
        }

        const loraName = decodeURIComponent(query);
        console.log("Searching for Lora:", loraName);

        const searchId = imageService.generateImageId(); // Generate a unique ID for the search
        loraSearchQueue.enqueue({ query: loraName, res, searchId }); // Add the search to the queue
    })

    app.get('/generateImage', async (req, res) => {
         if (imageQueue.queue.length >= config.MAX_QUEUE_SIZE) {
            return res.status(429).send({ error: "Server is busy. Please try again later." });
        }

        const { prompt, loraName } = req.query;

        if (!prompt) {
            return res.status(400).send({ error: "Prompt is required." });
        }

        const imageId = imageService.generateImageId();
        const job = { prompt, loraName, imageId, res, emitter: events };
        imageQueue.enqueue(job);
        res.send({
            success: true,
            imageId,
            imageUrl: `${config.API_URL}/${imageId}.jpg`,
            statusUrl: `${config.API_URL}/status/${imageId}`,
        });
    });

    app.get("/quota", async (req, res) => {
        res.send(await puppeteerService.generationPage.evaluate(() => {
            return document.querySelector("body > div.MuiModal-root.css-1sucic7 > div.flex.outline-none.flex-col.items-center.gap-4.w-full.md\\:w-\\[400px\\].min-h-\\[200px\\].absolute.bottom-0.md\\:bottom-auto.md\\:top-1\\/2.md\\:left-1\\/2.md\\:-translate-x-1\\/2.md\\:-translate-y-1\\/2.px-6.py-6.rounded-t-3xl.md\\:rounded-3xl.shadow-lg.bg-white.dark\\:bg-neutral-800.max-h-screen.overflow-y-auto.overflow-x-hidden.pb-\\[var\\(--is-mobile-pb\\)\\].md\\:pb-\\[var\\(--is-mobile-pb-md\\)\\] > div.-mt-2.flex.w-full.items-center.justify-center.gap-2 > a > div.flex.items-center.gap-2 > span")?.innerText
        }))
    })
};

module.exports = setupRoutes;