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

let pages = []; // Array to hold multiple page instances
let pageStatuses = []; // Array to track the status of each page (FREE/BUSY)
const NUM_INSTANCES = 1; // Number of browser instances to run
let WEIGHTS_GG_COOKIE = process.env.WEIGHTS_GG_COOKIE; // Cookie for weights.gg

let spaces = {}; // Dictionary to hold space instances
let spaceStatuses = {}; // Dictionary to track the status of each space (FREE/BUSY)

// --- Utility Functions ---
const generateImageId = () => crypto.randomBytes(16).toString("hex");
const generateSpaceId = () => crypto.randomBytes(16).toString("hex");

const downloadImage = (url, imageId) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(__dirname, 'images', `${imageId}.jpg`);
        const file = fs.createWriteStream(filePath);

        https.get(url, (response) => {
            response.pipe(file);

            file.on('finish', () => {
                file.close(() => {
                    resolve(filePath);
                });
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => reject(err)); // Delete the file if an error occurs
        });
    });
};

const saveBase64Image = async (base64Data, imageId, isFinal = false) => {
    const buffer = Buffer.from(base64Data, 'base64');
    const fileNameSuffix = isFinal ? '-final' : '';
    const filePath = path.join(__dirname, 'images', `${imageId}${fileNameSuffix}.jpg`);
    try {
        if (isFinal) {
            // Save the final image without resizing
            fs.writeFileSync(filePath, buffer);
            console.log(`Final image saved to ${filePath}`);
        } else {
            // Resize the image using sharp
            await sharp(buffer)
                .resize({ width: 300 }) // Adjust the width as needed
                .toFile(filePath);
            console.log(`Preview image saved to ${filePath}`);
        }
        return filePath;
    } catch (error) {
        console.error("Error saving image:", error);
        throw error;
    }
};

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
        await sleepBrowser(3000);
        let generatedImageElement = document.querySelector('img[alt="Generated Image"]');

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
        if (result.url.startsWith('data:image')) {
            await saveBase64Image(result.url.replace(/^data:image\/(png|jpeg|jpg);base64,/, ''), imageId, true);
        } else {
            await downloadImage(result.url, imageId);
        }
    } catch (error) {
        console.error("Error downloading final image:", error);
    }
}

async function createImageJob(prompt, page, emitter, imageId) {
    try {
        const result = await generateImage(prompt, page, emitter, imageId);
        console.log("Final image URL:", result.url);
        await handleImageResult(result, imageId);
    } finally {
        // Find the index of the current page and set its status to FREE
        const pageIndex = pages.indexOf(page);
        if (pageIndex !== -1) {
            pageStatuses[pageIndex] = 'FREE';
        }
    }
}

// --- Status Dictionary ---
let imageStatuses = {}; // Dictionary to hold status of each image

// --- Configuration ---
const API_URL = process.env.API_URL; // Default to localhost if not set
const API_KEY = process.env.API_KEY; // Replace with your actual API key

// --- Helper function to update image status ---
const updateImageStatus = (imageId, status, error = null) => {
    imageStatuses[imageId] = {
        ...imageStatuses[imageId], // Keep existing properties
        status: status,
        ...(error ? { error: error } : {}), // Add error only if it exists
    };
};

// --- Express Routes ---
const setupExpressRoutes = (emitter, port) => {
    const app = express();

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(express.static('images'));

    // Middleware to check API key
    const apiKeyCheck = (req, res, next) => {
        const apiKey = req.headers['x-api-key']; // Or req.query.apiKey if you prefer

        if (!apiKey || apiKey !== API_KEY) {
            return res.status(401).send({ error: 'Unauthorized: Missing or invalid API key' });
        }
        next();
    };

    // Apply the API key check middleware to the routes that require authentication
    app.use('/allocateSpace', apiKeyCheck);
    app.use('/addLora', apiKeyCheck);
    app.use('/removeLora', apiKeyCheck);
    app.use('/status', apiKeyCheck);
    app.use('/generateImageJob', apiKeyCheck);

    app.get('/health', (req, res) => {
        res.send({ status: 'OK' });
    });

    app.get('/allocateSpace', async (req, res) => {
        const spaceId = generateSpaceId();
        // Find the first available FREE page
        const availablePageIndex = pageStatuses.indexOf('FREE');
        if (availablePageIndex === -1) {
            return res.status(429).send({ error: "All instances are currently busy, please wait." });
        }

        spaces[spaceId] = pages[availablePageIndex];
        spaceStatuses[spaceId] = 'FREE';

        res.send({ success: true, spaceId: spaceId });
    });

    app.get('/addLora', async (req, res) => {
        const { loraName, spaceId } = req.query;
        if (!loraName) {
            return res.status(400).send({ error: "Lora name is required." });
        }
        if (!spaceId) {
            return res.status(400).send({ error: "Space ID is required." });
        }

        if (!spaces[spaceId]) {
            return res.status(404).send({ error: "Space ID not found." });
        }

        if (spaceStatuses[spaceId] === 'BUSY') {
            return res.status(429).send({ error: "Space is currently busy, please wait." });
        }

        const page = spaces[spaceId];
        spaceStatuses[spaceId] = 'BUSY';

        try {
            await addLora(loraName, page);
            res.send({ success: true });
            spaceStatuses[spaceId] = 'FREE';
        } catch (error) {
            console.error("Error adding Lora:", error);
            res.status(500).send({ success: false, error: "Failed to add Lora." });
            spaceStatuses[spaceId] = 'FREE';
        }
    });

    app.get('/removeLora', async (req, res) => {
        const { spaceId } = req.query;
         if (!spaceId) {
            return res.status(400).send({ error: "Space ID is required." });
        }

        if (!spaces[spaceId]) {
            return res.status(404).send({ error: "Space ID not found." });
        }

        if (spaceStatuses[spaceId] === 'BUSY') {
            return res.status(429).send({ error: "Space is currently busy, please wait." });
        }

        const page = spaces[spaceId];
        spaceStatuses[spaceId] = 'BUSY';

        try {
            await removeLora(page);
            res.send({ success: true });
            spaceStatuses[spaceId] = 'FREE';
        } catch (error) {
            console.error("Error removing Lora:", error);
            res.status(500).send({ success: false, error: "Failed to remove Lora." });
            spaceStatuses[spaceId] = 'FREE';
        }
    });

    app.get('/status/:imageId', (req, res) => {
        const { imageId } = req.params;
        const status = imageStatuses[imageId] || { status: 'NOT_FOUND' };
        res.send(status);
    });

    app.get('/generateImageJob', async (req, res) => {
        const { prompt, spaceId } = req.query;
        if (!prompt) {
            return res.status(400).send({ error: "Prompt is required." });
        }
        if (!spaceId) {
            return res.status(400).send({ error: "Space ID is required." });
        }

       if (!spaces[spaceId]) {
            return res.status(404).send({ error: "Space ID not found." });
        }

        if (spaceStatuses[spaceId] === 'BUSY') {
            return res.status(429).send({ error: "Space is currently busy, please wait." });
        }

        const page = spaces[spaceId];
        spaceStatuses[spaceId] = 'BUSY'; // Mark the space as busy

        const imageId = generateImageId();

        imageStatuses[imageId] = {
            status: 'STARTING',
            prompt: decodeURIComponent(prompt),
            startTime: new Date(),
            spaceId: spaceId, // Add the spaceId to the status
        };

        try {
            res.send({
                success: true,
                imageId: imageId,
                imageUrl: `${API_URL}/${imageId}.jpg`,
                statusUrl: `${API_URL}/status/${imageId}`,
                spaceId: spaceId, // Return the spaceId to the client
            });
            await createImageJob(decodeURIComponent(prompt), page, emitter, imageId);
            updateImageStatus(imageId, 'COMPLETED');
            spaceStatuses[spaceId] = 'FREE';
        } catch (error) {
            console.error("Error generating image:", error);
            updateImageStatus(imageId, 'FAILED', error.message);
            res.status(500).send({ success: false, error: "Failed to generate image." });
            spaceStatuses[spaceId] = 'FREE'; // Mark the space as free in case of error
        }
    });

    app.listen(port, () => {
        console.log(`Server is running at ${API_URL}:${port}`);
    });

    return app;
};

// --- Main Function ---
async function main(callback) {
    // Initialize multiple browser instances
    await Promise.race(Array.from({ length: NUM_INSTANCES }, async (_, i) => {
        const { browser, page } = await connect({ headless: false, args: [], customConfig: {}, turnstile: true, connectOption: {}, disableXvfb: false, ignoreAllFlags: false });
        pages.push(page);
        pageStatuses.push('FREE'); // Initially all pages are free
        await onStart(page);
        // console.log(`Instance ${i + 1} ready`);
    }));

    const emitter = new events.EventEmitter();

    // Expose function for preview updates
    for (const page of pages) {
        await page.exposeFunction('handlePreviewUpdate', async (data) => {
            console.log("Image preview updated in main process");
            emitter.emit('previewUpdate', data);
            try {
                if (data.url.startsWith('data:image')) {
                    await saveBase64Image(data.url.replace(/^data:image\/(png|jpeg|jpg);base64,/, ''), data.imageId);
                } else {
                    const filePath = await downloadImage(data.url, data.imageId);
                    console.log(`Image preview saved to ${filePath}`);
                }
                updateImageStatus(data.imageId, 'PENDING', null);
                imageStatuses[data.imageId].lastModifiedDate = new Date().getTime();
            } catch (error) {
                console.error("Error downloading image:", error);
            }
        });

        await page.evaluate(() => {
            window.addEventListener('previewUpdate', (event) => {
                window.handlePreviewUpdate(event.detail);
            });
        });
    }

    // --- Express App Setup ---
    const port = 3000;
    const app = setupExpressRoutes(emitter, port);

    callback(pages, emitter);
}

main((pages, emitter) => {
    // Optional callback after main setup is complete
    console.log(`${pages.length} instances are ready.`);
});

process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception: Something went wrong!', error);
    client.metrics.errors++;
});

process.on('unhandledRejection', (reason, promise) => {
    console.warn('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});