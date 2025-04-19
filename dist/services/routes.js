"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRoutes = void 0;
let generateTimer = 0;
let searchTimer = 0;
const apiKeyCheck = (config) => (req, res, next) => {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey || apiKey !== config.API_KEY) {
        res.status(401).send({
            error: "Unauthorized: Missing or invalid API key",
        });
        return;
    }
    next();
};
const healthRoute = (req, res) => {
    res.send({
        status: "OK",
    });
};
const statusRoute = (statusService) => (req, res) => {
    const { imageId } = req.params;
    const status = statusService.getImageStatus(imageId);
    res.send(status);
};
const searchLoraRoute = (loraSearchQueue, imageService, puppeteerService) => async (req, res) => {
    if (!searchTimer) {
        searchTimer = 100;
    }
    else {
        while (searchTimer < 0) {
            searchTimer--;
            searchLoraRoute(loraSearchQueue, imageService, puppeteerService);
            return;
        }
    }
    const { query } = req.query;
    if (!query || typeof query !== "string") {
        res.status(400).send({
            error: "Query parameter is required.",
        });
        return;
    }
    const loraName = decodeURIComponent(query);
    const searchId = imageService.generateImageId();
    loraSearchQueue.enqueueSearch({
        job: {
            query: loraName,
            res,
        },
        id: searchId,
        data: {
            query: loraName,
        },
    }, puppeteerService.loraSearchPage);
};
const generateImageRoute = (imageQueue, config, imageService, events, puppeteerService, statusService) => async (req, res) => {
    if (!generateTimer) {
        generateTimer = 100;
    }
    else {
        while (generateTimer < 0) {
            generateTimer--;
            generateImageRoute(imageQueue, config, imageService, events, puppeteerService, statusService);
            return;
        }
    }
    if (imageQueue.queue.length >= config.MAX_QUEUE_SIZE) {
        res.status(429).send({
            error: "Server is busy. Please try again later.",
        });
        return;
    }
    const { prompt, loraName } = req.query;
    const imageId = imageService.generateImageId();
    // if (!loraName || typeof loraName !== "string") {
    //   const headers = {
    //     "content-type": "application/json",
    //   };
    //   const { data } = await fetch("https://fooocus.one/api/predictions", {
    //     headers,
    //     body: JSON.stringify({
    //       model: "black-forest-labs/flux-schnell",
    //       input: {
    //         prompt: req.query.prompt,
    //         go_fast: true,
    //         megapixels: "0.25",
    //         num_outputs: 1,
    //         aspect_ratio: "1:1",
    //         output_format: "webp",
    //         output_quality: 100,
    //         num_inference_steps: 4,
    //         disable_safety_checker: true,
    //       },
    //     }),
    //     method: "POST",
    //   }).then((res) => res.json());
    //   let output = null;
    //   while (!output) {
    //     const sleep = (ms: number) =>
    //       new Promise((resolve) => setTimeout(resolve, ms));
    //     await sleep(200);
    //     fetch("https://fooocus.one/api/predictions/" + data.id, {
    //       headers,
    //       referrer: "https://fooocus.one/fr/apps/flux",
    //       referrerPolicy: "strict-origin-when-cross-origin",
    //       body: null,
    //       method: "GET",
    //       mode: "cors",
    //       credentials: "include",
    //     })
    //       .then((res) => res.json())
    //       .then((data) => {
    //         if (data.output) {
    //           output = data.output[0];
    //         }
    //       });
    //   }
    //   fetch(output)
    //     .then((response) => {
    //       if (!response.ok) throw new Error("Network response was not ok");
    //       if (!response.body) throw new Error("Response body is null");
    //     })
    //     .catch((err) => {
    //       console.error(err);
    //       res.status(500).send("Error fetching image");
    //     });
    //   await imageService.downloadImage(output, imageId);
    //   statusService.updateImageStatus(imageId, "COMPLETED");
    //   res.setHeader("Content-Type", "application/json");
    //   res.send({
    //     success: true,
    //     imageId: imageId,
    //     statusUrl: `${config.API_URL}/status/${imageId}`,
    //   });
    // } else {
    const job = {
        prompt: prompt,
        loraName: typeof loraName === "string" ? loraName : null,
        imageId,
        res,
        emitter: events,
    };
    statusService.updateImageStatus(imageId, "QUEUED");
    imageQueue.enqueue({
        job,
        id: imageId,
        data: {
            prompt,
        },
    }, puppeteerService.generationPage);
    res.send({
        success: true,
        imageId,
        statusUrl: `${config.API_URL}/status/${imageId}`,
    });
    // }
};
const quotaRoute = (puppeteerService) => async (_req, res) => {
    const quota = await puppeteerService.getGenerationPage()?.evaluate(() => {
        const element = document.querySelector("body > div.MuiModal-root.css-1sucic7 > div.flex.outline-none.flex-col.items-center.gap-4.w-full.md\\:w-\\[400px\\].min-h-\\[200px\\].absolute.bottom-0.md\\:bottom-auto.md\\:top-1\\/2.md\\:left-1\\/2.md\\:-translate-x-1\\/2.md\\:-translate-y-1\\/2.px-6.py-6.rounded-t-3xl.md\\:rounded-3xl.shadow-lg.bg-white.dark\\:bg-neutral-800.max-h-screen.overflow-y-auto.overflow-x-hidden.pb-\\[var\\(--is-mobile-pb\\)\\].md\\:pb-\\[var\\(--is-mobile-pb-md\\)\\] > div.-mt-2.flex.w-full.items-center.justify-center.gap-2 > a > div.flex.items-center.gap-2 > span");
        return element?.textContent || null;
    });
    res.send(quota);
};
const setupRoutes = (app, config, puppeteerService, imageService, statusService, imageQueue, loraSearchQueue, events) => {
    app.use(apiKeyCheck(config));
    app.get("/health", healthRoute);
    app.get("/status/:imageId", statusRoute(statusService));
    app.get("/search-loras", searchLoraRoute(loraSearchQueue, imageService, puppeteerService));
    app.get("/generateImage", generateImageRoute(imageQueue, config, imageService, events, puppeteerService, statusService));
    app.get("/quota", (req, res) => quotaRoute(puppeteerService)(req, res));
};
exports.setupRoutes = setupRoutes;
exports.default = exports.setupRoutes;
