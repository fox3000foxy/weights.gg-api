// --- index.js ---
const express = require('express');
const bodyParser = require('body-parser');
const events = require('events');
const fs = require('fs');
const path = require('path');

const config = require('./services/config');
const PuppeteerService = require('./services/puppeteerService');
const Queue = require('./services/queueService');
const ImageService = require('./services/imageService');
const LoraService = require('./services/loraService');
const StatusService = require('./services/statusService');
const setupRoutes = require('./services/routes');
const generateImage = require('./services/imageGeneration');

// --- Globals ---
let oldLoraName = null; // Variable to hold the previous Lora name

// --- Services Initialization ---
const puppeteerService = new PuppeteerService();
const imageService = new ImageService(config);
const loraService = new LoraService(config);
const statusService = new StatusService();

// --- Queue Initialization ---
const imageQueue = new Queue(config.MAX_QUEUE_SIZE);
const loraSearchQueue = new Queue();

// --- Express App ---
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(config.IMAGE_DIR));

// --- Image Processing ---
class ImageProcessor {
    constructor(puppeteerService, imageService, loraService, statusService, config, imageQueue) {
        this.puppeteerService = puppeteerService;
        this.imageService = imageService;
        this.loraService = loraService;
        this.statusService = statusService;
        this.config = config;
        this.imageQueue = imageQueue
        this.oldLoraName = null;
    }

    async processImage(job) {
        const { prompt, loraName, imageId, emitter } = job;
        let page = this.puppeteerService.generationPage;

        try {
            this.statusService.updateImageStatus(imageId, 'STARTING');
            await this.handleLora(loraName, page);
            const result = await generateImage(decodeURIComponent(prompt), page, emitter, imageId);
            await this.handleImageResult(result, imageId);
        } catch (error) {
            console.error("Error generating image:", error);
            this.statusService.updateImageStatus(imageId, 'FAILED', error.message);
            console.log("Refreshing the page after an error");
            this.puppeteerService.generationPage = await this.puppeteerService.restartPage(page, this.config.WEIGHTS_GG_COOKIE);
            await this.puppeteerService.onStart(this.puppeteerService.generationPage, this.config.WEIGHTS_GG_COOKIE);
        }
    }

    async handleLora(loraName, page) {
        if (loraName) {
            if (this.oldLoraName !== loraName) {
                if (this.oldLoraName) await this.loraService.removeLora(page);
                const loraAdded = await this.loraService.addLora(loraName, page);
                if (!loraAdded) {
                    console.log("Failed to add Lora, requeuing job.");
                    this.imageQueue.enqueue({...job, loraName: null}); // Re-add the job to the front of the queue
                    return;
                }
                this.oldLoraName = loraName;
            }
        } else if (this.oldLoraName) {
            await this.loraService.removeLora(page);
            this.oldLoraName = null;
        }
    }

    async handleImageResult(result, imageId) {
        if (result.error) {
            console.error("Error generating image:", result.error);
            this.statusService.updateImageStatus(imageId, 'FAILED', result.error);
            this.puppeteerService.generationPage = await this.puppeteerService.restartPage(this.puppeteerService.generationPage, this.config.WEIGHTS_GG_COOKIE);
            await this.puppeteerService.onStart(this.puppeteerService.generationPage, this.config.WEIGHTS_GG_COOKIE);
        } else {
            console.log("Final image URL:", result.url);
            try {
                const base64Data = result.url.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
                const filePath = result.url.startsWith('data:image')
                    ? await this.imageService.saveBase64Image(base64Data, imageId, true)
                    : await this.imageService.downloadImage(result.url, imageId);
                console.log(`Final image saved to ${filePath}`);
            } catch (error) {
                console.error("Error handling final image:", error);
                this.statusService.updateImageStatus(imageId, 'FAILED', error.message);
            }
            this.statusService.updateImageStatus(imageId, 'COMPLETED');
        }
    }
}

// --- Lora Search Processing ---
class LoraSearchProcessor {
    constructor(loraService) {
        this.loraService = loraService;
    }

    async processLoraSearch(job) {
        const { query, res } = job;

        try {
            if (this.loraService.loraSearchCache.has(query)) {
                console.log(`Using cached result for Lora search: ${query}`);
                const cachedResult = this.loraService.loraSearchCache.get(query);
                res.send(cachedResult);
                return;
            }

            const searchResult = await this.performLoraSearch(query);
            res.send(searchResult);
        } catch (error) {
            console.error("Error during Lora search:", error);
            // res.status(500).send({ error: error.message });
            res.send([]);
        }
    }

    async performLoraSearch(query) {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error("Lora search timed out"));
            }, 5000); // 5 seconds timeout
        });

        try {
            const result = await Promise.race([
                // Change searchLora to searchLoras to match the method name in LoraService
                this.loraService.searchLoras(query, puppeteerService.loraSearchPage),
                timeoutPromise
            ]);

            if (result.length !== 0) {
                this.loraService.loraSearchCache.set(query, result)
                this.loraService.saveLoraCache(); // Save the cache after updating it
            }

            clearTimeout(timeoutId);
            return result;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
}

// --- Services ---
const imageProcessor = new ImageProcessor(puppeteerService, imageService, loraService, statusService, config, imageQueue);
const loraSearchProcessor = new LoraSearchProcessor(loraService);

// --- Queue Processors ---
const processImageJob = async (job) => {
    await imageProcessor.processImage(job);
};

const processLoraSearchJob = async (job) => {
    await loraSearchProcessor.processLoraSearch(job);
};

// --- Preview Handler
class PreviewHandler {
    constructor(imageService, statusService, emitter) {
        this.imageService = imageService;
        this.statusService = statusService;
        this.emitter = emitter
    }

    async handlePreviewUpdate(data) {
        console.log("Image preview updated in main process");
        this.emitter.emit('previewUpdate', data);
        try {
            const base64Data = data.url.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
            const filePath = data.url.startsWith('data:image')
                ? await this.imageService.saveBase64Image(base64Data, data.imageId)
                : await this.imageService.downloadImage(data.url, data.imageId);

            console.log(`Image preview saved to ${filePath}`);
            this.statusService.updateImageStatus(data.imageId, 'PENDING', null);
            this.statusService.imageStatuses[data.imageId].lastModifiedDate = new Date().getTime();
        } catch (error) {
            console.error("Error downloading image:", error);
            this.statusService.updateImageStatus(data.imageId, 'FAILED', error.message);
        }
    }

    debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }
}

// --- Main Function ---
async function main() {
    // Create the 'images' directory if it doesn't exist
    if (!fs.existsSync(config.IMAGE_DIR)) {
        fs.mkdirSync(path.join(__dirname, config.IMAGE_DIR));
        console.log(`Directory "${config.IMAGE_DIR}" created.`);
    }

    await puppeteerService.initialize();
    await Promise.all([
        puppeteerService.onStart(puppeteerService.generationPage, config.WEIGHTS_GG_COOKIE),
        puppeteerService.onStart(puppeteerService.loraSearchPage, config.WEIGHTS_GG_COOKIE)
    ]);

    const emitter = new events.EventEmitter();
    const previewHandler = new PreviewHandler(imageService, statusService, emitter);
    const debouncedHandlePreviewUpdate = previewHandler.debounce(previewHandler.handlePreviewUpdate.bind(previewHandler), 200);

    await puppeteerService.generationPage.exposeFunction('handlePreviewUpdate', debouncedHandlePreviewUpdate);

    await puppeteerService.generationPage.evaluate(() => {
        window.addEventListener('previewUpdate', (event) => {
            window.handlePreviewUpdate(event.detail);
        });
    });

    imageQueue.process(processImageJob);
    loraSearchQueue.process(processLoraSearchJob);

    setupRoutes(app, config, puppeteerService, imageService, loraService, statusService, imageQueue, loraSearchQueue, emitter);

    app.listen(config.PORT, () => {
        console.log(`Server is running on port ${config.PORT}`);
    });
}

main().catch(console.error);