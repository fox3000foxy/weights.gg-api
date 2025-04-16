const { connect } = require("puppeteer-real-browser");
const events = require('events');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const sharp = require('sharp');
require('dotenv').config();

// --- Configuration ---
const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;
const WEIGHTS_GG_COOKIE = process.env.WEIGHTS_GG_COOKIE;
const PORT = 3000;

// --- Constants ---
const IMAGE_WIDTH = 300; // Width for preview images
const IMAGE_DIR = path.join(__dirname, 'images');

// --- Globals ---
let page = null; // Single page instance
let oldLoraName = null; // Variable to hold the previous Lora name

// --- Queue System ---
let jobQueue = [];
let processing = false;

// --- Status Dictionary ---
let imageStatuses = {}; // Dictionary to hold status of each image

// --- Utility Functions ---
const generateImageId = () => crypto.randomBytes(16).toString("hex");

const downloadImage = (url, imageId) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(IMAGE_DIR, `${imageId}.jpg`);
        const file = fs.createWriteStream(filePath);

        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => file.close(() => resolve(filePath)));
        }).on('error', (err) => {
            fs.unlink(filePath, () => reject(err)); // Delete the file if an error occurs
        });
    });
};

const saveBase64Image = async (base64Data, imageId, isFinal = false) => {
    const buffer = Buffer.from(base64Data, 'base64');
    const fileNameSuffix = isFinal ? '-final' : '';
    const filePath = path.join(IMAGE_DIR, `${imageId}${fileNameSuffix}.jpg`);

    try {
        if (isFinal) {
            fs.writeFileSync(filePath, buffer);
            console.log(`Final image saved to ${filePath}`);
        } else {
            await sharp(buffer)
                .resize({ width: IMAGE_WIDTH })
                .toFile(filePath);
            console.log(`Preview image saved to ${filePath}`);
        }
        return filePath;
    } catch (error) {
        console.error("Error saving image:", error);
        throw error;
    }
};

const updateImageStatus = (imageId, status, error = null) => {
    imageStatuses[imageId] = {
        ...imageStatuses[imageId],
        status,
        ...(error ? { error } : {}),
    };
};

const sleepBrowser = ms => new Promise(r => setTimeout(r, ms));

// Helper function to wait for and query a selector
async function waitForAndQuerySelector(page, selector, timeout = 10000) {
    const startTime = Date.now();
    while (!await page.$(selector)) {
        if (Date.now() - startTime > timeout) {
            throw new Error(`Timeout waiting for selector: ${selector}`);
        }
        console.log(`${selector} not loaded yet, waiting...`);
        await sleepBrowser(10);
    }
    return await page.$(selector);
}

// --- Puppeteer Functions ---
async function onStart(page) {
    await page.goto("https://weights.gg/create", { waitUntil: "load" });
    await page.evaluate((cookie) => {
        document.cookie = cookie;
    }, WEIGHTS_GG_COOKIE);
    await page.reload({ waitUntil: "load" });
    await page.evaluate(() => {
        document.querySelector("#__next > main > div > div > div > div.my-4.flex.w-full.flex-col.gap-8 > div:nth-child(4) > div:nth-child(1) > div.flex.w-full.gap-2 > button").click()
    });
    console.log("Context ready");
}

async function generateImage(prompt, page, emitter, imageId) {
    console.log("Generating image with prompt:", prompt);
    let imageUrl = await page.evaluate(async (prompt, emitter, imageId) => {
        const sleepBrowser = ms => new Promise(r => setTimeout(r, ms));

        // Helper function to wait for and query a selector
        async function waitForAndQuerySelector(selector) {
            while (!document.querySelector(selector)) {
                console.log(`${selector} not loaded yet, waiting...`);
                await sleepBrowser(10);
            }
            return document.querySelector(selector);
        }

        // Focus on the image input
        const imageInput = await waitForAndQuerySelector("#imagegen-input");
        imageInput.innerText = prompt;
        imageInput.dispatchEvent(new Event("input", { bubbles: true }));
        imageInput.dispatchEvent(new Event("change", { bubbles: true }));
        imageInput.dispatchEvent(new Event("blur", { bubbles: true }));

        // Click the generate button
        const generateButton = await waitForAndQuerySelector("body > div.MuiModal-root.css-1sucic7 > div.flex.outline-none.flex-col.items-center.gap-4.w-full.md\\:w-\\[400px\\].min-h-\\[200px\\].absolute.bottom-0.md\\:bottom-auto.md\\:top-1\\/2.md\\:left-1\\/2.md\\:-translate-x-1\\/2.md\\:-translate-y-1\\/2.px-6.py-6.rounded-t-3xl.md\\:rounded-3xl.shadow-lg.bg-white.dark\\:bg-neutral-800.max-h-screen.overflow-y-auto.overflow-x-hidden.pb-\\[var\\(--is-mobile-pb\\)\\].md\\:pb-\\[var\\(--is-mobile-pb-md\\)\\] > button.flex.w-full.items-center.justify-center.gap-2.rounded-lg.bg-black.px-3.py-1.font-bold.text-white.hover-scale");
        generateButton.click();

        let oldPreview = null;
        let generatedImageElement = document.querySelector('img[alt="Generated Image"]');
        while (generatedImageElement && generatedImageElement.src) {
            await sleepBrowser(10);
            generatedImageElement = document.querySelector('img[alt="Generated Image"]');
        }

        while (!generatedImageElement || !generatedImageElement.src) {
            console.log("Image not generated yet, waiting...");
            await sleepBrowser(10);

            const previewElement = document.querySelector('img[alt="image-preview"]');
            if (previewElement && oldPreview !== previewElement.src) {
                oldPreview = previewElement.src;
                window.dispatchEvent(new CustomEvent('previewUpdate', { detail: { url: oldPreview, imageId: imageId } }));
            }

            generatedImageElement = document.querySelector('img[alt="Generated Image"]');
        }

        return { url: generatedImageElement.src, imageId: imageId };
    }, prompt, emitter, imageId);

    return imageUrl;
}

async function addLora(loraName, page) {
    await page.evaluate(async () => {
        const sleepBrowser = ms => new Promise(r => setTimeout(r, ms));

        // Helper function to wait for and query a selector
        async function waitForAndQuerySelector(selector) {
            while (!document.querySelector(selector)) {
                console.log(`${selector} not loaded yet, waiting...`);
                await sleepBrowser(10);
            }
            return document.querySelector(selector);
        }

        const loraButton = await waitForAndQuerySelector("button.hover-scale.flex.h-7.w-full.items-center.gap-2.rounded-lg.bg-gray-100.px-2");
        loraButton.click();

        const element = await waitForAndQuerySelector('[id^="«r"]');
        element.click();
        element.focus();
    });

    console.log("Element focused")

    await page.type('[id^="«r"]', decodeURIComponent(loraName));
    await page.keyboard.press('Enter');

        console.log("Lora name entered")

        await page.evaluate(async () => {
            const sleepBrowser = ms => new Promise(r => setTimeout(r, ms));

            // Helper function to wait for and query a selector
            async function waitForAndQuerySelector(selector, timeout = 10000) {
                const startTime = Date.now();
                while (!document.querySelector(selector)) {
                    if (Date.now() - startTime > timeout) {
                        throw new Error(`Timeout waiting for selector: ${selector}`);
                    }
                    console.log(`${selector} not loaded yet, waiting...`);
                    await sleepBrowser(10);
                }
                return document.querySelector(selector);
            }
            const loraSelection = await waitForAndQuerySelector("div.flex.outline-none.flex-col.items-center.gap-4.w-full.md\\:w-\\[400px\\].min-h-\\[200px\\].absolute.bottom-0.md\\:bottom-auto.md\\:top-1\\/2.md\\:left-1\\/2.md\\:-translate-x-1\\/2.md\\:-translate-y-1\\/2.px-6.py-6.rounded-t-3xl.md\\:rounded-3xl.shadow-lg.bg-white.dark\\:bg-neutral-800.max-h-screen.overflow-y-auto.overflow-x-hidden.pb-\\[var\\(--is-mobile-pb\\)\\].md\\:pb-\\[var\\(--is-mobile-pb-md\\)\\] > div > div.h-96.w-full.overflow-hidden.rounded-2xl.bg-gray-100.dark\\:bg-neutral-900 > div > div > div:nth-child(2) > div > div > div")
            loraSelection.click()
            await waitForAndQuerySelector("#imagegen-input");
        });
        console.log("Lora selected")
}

async function removeLora(page) {
    await page.evaluate(() => {
        // if(document.querySelector("div.-mb-2.-mt-4.flex.w-full > div > a > button"))
        document.querySelector("div.-mb-2.-mt-4.flex.w-full > div > a > button").click()
    });
}

async function handleImageResult(result, imageId) {
    try {
        const base64Data = result.url.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
        const filePath = result.url.startsWith('data:image')
            ? await saveBase64Image(base64Data, imageId, true)
            : await downloadImage(result.url, imageId);
        console.log(`Final image saved to ${filePath}`);
    } catch (error) {
        console.error("Error handling final image:", error);
        updateImageStatus(imageId, 'FAILED', error.message);
    }
}

async function createImageJob(prompt, page, emitter, imageId) {
    try {
        const result = await generateImage(prompt, page, emitter, imageId);
        console.log("Final image URL:", result.url);
        await handleImageResult(result, imageId);
        updateImageStatus(imageId, 'COMPLETED');
    } catch (error) {
        console.error("Error generating image:", error);
        updateImageStatus(imageId, 'FAILED', error.message);
    } finally {
        processing = false;
        processQueue();
    }
}

// --- Queue Processing Function ---
async function processQueue() {
    if (processing || jobQueue.length === 0) return;

    const job = jobQueue.shift();
    const { prompt, loraName, imageId, res, emitter } = job;

    if (!page) {
        jobQueue.unshift(job);
        console.log("Page not ready, waiting 5 seconds...");
        setTimeout(processQueue, 5000);
        return;
    }

    processing = true;
    updateImageStatus(imageId, 'STARTING');

    try {
        if (loraName) {
            if (oldLoraName !== loraName) {
                if (oldLoraName) await removeLora(page);
                await addLora(loraName, page);
                oldLoraName = loraName;
            }
        } else if (oldLoraName) {
            await removeLora(page);
            oldLoraName = null;
        }

        res.send({
            success: true,
            imageId,
            imageUrl: `${API_URL}/${imageId}.jpg`,
            statusUrl: `${API_URL}/status/${imageId}`,
        });

        await createImageJob(decodeURIComponent(prompt), page, emitter, imageId);
    } catch (error) {
        console.error("Error generating image:", error);
        updateImageStatus(imageId, 'FAILED', error.message);
        res.status(500).send({ success: false, error: "Failed to generate image." });
    } finally {
        processing = false;
        processQueue();
    }
}

// --- Express Routes ---
const setupExpressRoutes = (emitter) => {
    const app = express();

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(express.static('images'));

    // Middleware to check API key
    const apiKeyCheck = (req, res, next) => {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey || apiKey !== API_KEY) {
            return res.status(401).send({ error: 'Unauthorized: Missing or invalid API key' });
        }
        next();
    };

    app.use('/status', apiKeyCheck);
    app.use('/generateImage', apiKeyCheck);

    app.get('/health', (req, res) => res.send({ status: 'OK' }));

    app.get('/status/:imageId', (req, res) => {
        const { imageId } = req.params;
        const status = imageStatuses[imageId] || { status: 'NOT_FOUND' };
        res.send(status);
    });

    app.get('/generateImage', async (req, res) => {
        const { prompt, loraName } = req.query;

        if (!prompt) {
            return res.status(400).send({ error: "Prompt is required." });
        }

        const imageId = generateImageId();
        const job = { prompt, loraName, imageId, res, emitter };
        jobQueue.push(job);
        processQueue();
    });

    return app;
};

// --- Main Function ---
async function main(callback) {
    // Create the 'images' directory if it doesn't exist
    if (!fs.existsSync(IMAGE_DIR)) {
        fs.mkdirSync(IMAGE_DIR);
        console.log(`Directory "${IMAGE_DIR}" created.`);
    }

    const { browser, page: newPage } = await connect({ headless: false, args: [], customConfig: {}, turnstile: true, connectOption: {}, disableXvfb: false, ignoreAllFlags: false });
    page = newPage;
    await onStart(page);

    const emitter = new events.EventEmitter();

    // Expose function for preview updates
    await page.exposeFunction('handlePreviewUpdate', async (data) => {
        console.log("Image preview updated in main process");
        emitter.emit('previewUpdate', data);
        try {
            const base64Data = data.url.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
            const filePath = data.url.startsWith('data:image')
                ? await saveBase64Image(base64Data, data.imageId)
                : await downloadImage(data.url, data.imageId);

            console.log(`Image preview saved to ${filePath}`);
            updateImageStatus(data.imageId, 'PENDING', null);
            imageStatuses[data.imageId].lastModifiedDate = new Date().getTime();
        } catch (error) {
            console.error("Error downloading image:", error);
            updateImageStatus(data.imageId, 'FAILED', error.message);
        }
    });

    await page.evaluate(() => {
        window.addEventListener('previewUpdate', (event) => {
            window.handlePreviewUpdate(event.detail);
        });
    });

    const app = setupExpressRoutes(emitter);
    app.listen(PORT, () => {
        console.log(`Server is running at ${API_URL}:${PORT}`);
    });

    callback(page, emitter);
}

// --- Initialize ---
main((page, emitter) => {
    console.log(`One instance is ready.`);
});

// --- Error Handling ---
process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception: Something went wrong!', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.warn('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});
