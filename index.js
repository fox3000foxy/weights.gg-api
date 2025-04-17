const { connect } = require("puppeteer-real-browser");
const events = require('events');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const sharp = require('sharp');
const process = require('process');
require('dotenv').config();

// --- Configuration ---
const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;
const WEIGHTS_GG_COOKIE = process.env.WEIGHTS_GG_COOKIE;
const PORT = 3000;
const MAX_QUEUE_SIZE = 10;

// --- Constants ---
const IMAGE_WIDTH = 400; // Width for preview images
const IMAGE_DIR = path.join(__dirname, 'images');

// --- Globals ---
let generationPage = null; // Single page instance
let oldLoraName = null; // Variable to hold the previous Lora name
let loraSearchPage = null;

// --- Queue System ---
let jobQueue = [];
let processing = false;

let loraSearchQueue = []; // New queue for LORA searches
let loraSearchProcessing = false;

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
                .jpeg({ quality: 80 }) // Adjust quality as needed
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
async function waitForAndQuerySelector(page, selector, timeout = 10000, delay = 50) {
    const startTime = Date.now();
    while (!await page.$(selector)) {
        if (Date.now() - startTime > timeout) {
            throw new Error(`Timeout waiting for selector: ${selector}`);
        }
        console.log(`${selector} not loaded yet, waiting...`);
        await sleepBrowser(delay);
    }
    await sleepBrowser(50); // Add a small delay after finding the selector
    return await page.$(selector);
}

const debounce = (func, delay) => {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
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

        if(document.querySelector(".break-words")) {
            prompt = document.querySelector(".break-words").innerText + ", " + prompt;
            console.log("Prompt updated to:", prompt);
        }

        // Focus on the image input
        const imageInput = document.querySelector("#imagegen-input");
        imageInput.focus();
        imageInput.click();
        imageInput.innerText = prompt;
        imageInput.dispatchEvent(new Event("input", { bubbles: true }));
        imageInput.dispatchEvent(new Event("change", { bubbles: true }));
        imageInput.dispatchEvent(new Event("blur", { bubbles: true }));

        console.log("Image generation input focused and prompt set:", prompt);

        // return;
        // Click the generate button
        const generateButton = await waitForAndQuerySelector("body > div.MuiModal-root.css-1sucic7 > div.flex.outline-none.flex-col.items-center.gap-4.w-full.md\\:w-\\[400px\\].min-h-\\[200px\\].absolute.bottom-0.md\\:bottom-auto.md\\:top-1\\/2.md\\:left-1\\/2.md\\:-translate-x-1\\/2.md\\:-translate-y-1\\/2.px-6.py-6.rounded-t-3xl.md\\:rounded-3xl.shadow-lg.bg-white.dark\\:bg-neutral-800.max-h-screen.overflow-y-auto.overflow-x-hidden.pb-\\[var\\(--is-mobile-pb\\)\\].md\\:pb-\\[var\\(--is-mobile-pb-md\\)\\] > button.flex.w-full.items-center.justify-center.gap-2.rounded-lg.bg-black.px-3.py-1.font-bold.text-white.hover-scale");
        generateButton.click();

        let generatedImageElement = document.querySelector('img[alt="Generated Image"]');
        while (generatedImageElement && generatedImageElement.src) {
            await sleepBrowser(10);
            generatedImageElement = document.querySelector('img[alt="Generated Image"]');
        }

        let oldPreview = null;

        while (!generatedImageElement || !generatedImageElement.src) {
            console.log("Image not generated yet, waiting...");
            await sleepBrowser(10);

            // Error toast
            if(document.querySelector(".Toastify__toast-container")) {
                document.querySelector(".Toastify__toast-container").remove();
                console.log("Error toast removed");
                return { error: "Error generating image. Filters doesn't really love your prompt..." };
            }

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
    try {
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

        console.log("Element focused");

        await page.type('[id^="«r"]', decodeURIComponent(loraName));
        await page.keyboard.press('Enter');

        console.log("Lora name entered");

        const loraFound = await page.evaluate(async () => {
            const sleepBrowser = ms => new Promise(r => setTimeout(r, ms));

            // Helper function to wait for and query a selector
            async function waitForAndQuerySelector(selector, timeout = 5000) {
                const startTime = Date.now();
                while (!document.querySelector(selector)) {
                    if (Date.now() - startTime > timeout) {
                        return null; // Return null if the selector is not found within the timeout
                    }
                    console.log(`${selector} not loaded yet, waiting...`);
                    await sleepBrowser(10);
                }
                return document.querySelector(selector);
            }

            const loraSelection = await waitForAndQuerySelector("div.flex.outline-none.flex-col.items-center.gap-4.w-full.md\\:w-\\[400px\\].min-h-\\[200px\\].absolute.bottom-0.md\\:bottom-auto.md\\:top-1\\/2.md\\:left-1\\/2.md\\:-translate-x-1\\/2.md\\:-translate-y-1\\/2.px-6.py-6.rounded-t-3xl.md\\:rounded-3xl.shadow-lg.bg-white.dark\\:bg-neutral-800.max-h-screen.overflow-y-auto.overflow-x-hidden.pb-\\[var\\(--is-mobile-pb\\)\\].md\\:pb-\\[var\\(--is-mobile-pb-md\\)\\] > div > div.h-96.w-full.overflow-hidden.rounded-2xl.bg-gray-100.dark\\:bg-neutral-900 > div > div > div:nth-child(2) > div > div > div", 5000); // Reduced timeout to 5 seconds

            if (loraSelection) {
                loraSelection.click();
                await waitForAndQuerySelector("#imagegen-input");
                return true; // Lora was found and selected
            } else {
                return false; // Lora was not found
            }
        });

        if (loraFound) {
            console.log("Lora selected");
        } else {
            console.log("Lora not found, skipping selection.");
            await page.keyboard.press('Escape'); // Close the Lora selection modal
            oldLoraName = null;
            return false;
        }
    } catch (error) {
        console.error("Error adding Lora:", error);
        // If Lora is not found, you might want to handle this case in the calling function
        // For example, you might want to set oldLoraName to null to indicate that no Lora is currently selected
        // Or you might want to retry the Lora search with a different name
        // throw error; // Re-throw the error to be handled by the calling function
    }
    return true;
}


async function removeLora(page) {
    await page.evaluate(() => {
        if(document.querySelector("div.-mb-2.-mt-4.flex.w-full > div > a > button"))
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
        updateImageStatus(imageId, 'STARTING');
        const result = await generateImage(prompt, page, emitter, imageId);
        if(result.error) {
            console.error("Error generating image:", result.error);
            updateImageStatus(imageId, 'FAILED', result.error);
                    try {
            await page.close();
            const { browser: newBrowser, page: newPage } = await connect({ headless: false, args: [], customConfig: {}, turnstile: true, connectOption: {}, disableXvfb: false, ignoreAllFlags: false });
            generationPage = newPage;
            await onStart(generationPage);
            console.log("Page restarted successfully.");
        } catch (restartError) {
            console.error("Failed to restart the page:", restartError);
            // Handle the restart error as needed
        }
            // console.log("This is pid " + process.pid);
            // setTimeout(function () {
            //     process.on("exit", function () {
            //         require("child_process").spawn(process.argv.shift(), process.argv, {
            //             cwd: process.cwd(),
            //             detached : true,
            //             stdio: "inherit"
            //         });
            //     });
            //     process.exit();
            // }, 500);
        } else {
            console.log("Final image URL:", result.url);
            await handleImageResult(result, imageId);
            updateImageStatus(imageId, 'COMPLETED');    

        }
    } catch (error) {
        console.error("Error generating image:", error);
        updateImageStatus(imageId, 'FAILED', error.message);
        console.log("Refreshing the page after an error");
        try {
            await page.close();
            const { browser: newBrowser, page: newPage } = await connect({ headless: false, args: [], customConfig: {}, turnstile: true, connectOption: {}, disableXvfb: false, ignoreAllFlags: false });
            generationPage = newPage;
            await onStart(generationPage);
            console.log("Page restarted successfully.");
        } catch (restartError) {
            console.error("Failed to restart the page:", restartError);
            // Handle the restart error as needed
        }
    } finally {
        console.log("Image job finished for ID:", imageId);
        processing = false;
        processQueue();
    }
}

async function searchLoras(loraName, page) {
    await page.evaluate(async (loraName) => {
        const sleepBrowser = ms => new Promise(r => setTimeout(r, ms));
        const loraButton = document.querySelector("button.hover-scale.flex.h-7.w-full.items-center.gap-2.rounded-lg.bg-gray-100.px-2");
        loraButton.click();
        await sleepBrowser(500);
        
        async function waitForAndQuerySelector(selector) {
            while (!document.querySelector(selector)) {
                console.log(`${selector} not loaded yet, waiting...`);
                await sleepBrowser(10);
            }
            return document.querySelector(selector);
        }
        await waitForAndQuerySelector('[id^="«r"]');
    }, loraName);
    await page.type('[id^="«r"]', decodeURIComponent(loraName));
    await page.keyboard.press('Enter');

    const loraList = await page.evaluate(async (loraName) => {
        const sleepBrowser = ms => new Promise(r => setTimeout(r, ms));

        while(
            !document.querySelector("div.flex.outline-none.flex-col.items-center.gap-4.w-full.md\\:w-\\[400px\\].min-h-\\[200px\\].absolute.bottom-0.md\\:bottom-auto.md\\:top-1\\/2.md\\:left-1\\/2.md\\:-translate-x-1\\/2.md\\:-translate-y-1\\/2.px-6.py-6.rounded-t-3xl.md\\:rounded-3xl.shadow-lg.bg-white.dark\\:bg-neutral-800.max-h-screen.overflow-y-auto.overflow-x-hidden.pb-\\[var\\(--is-mobile-pb\\)\\].md\\:pb-\\[var\\(--is-mobile-pb-md\\)\\] > div > div.h-96.w-full.overflow-hidden.rounded-2xl.bg-gray-100.dark\\:bg-neutral-900 > div > div > div:nth-child(2) > div > div > div")
        &&  !document.querySelector("body > div:nth-child(15) > div.flex.outline-none.flex-col.items-center.gap-4.w-full.md\\:w-\\[400px\\].min-h-\\[200px\\].absolute.bottom-0.md\\:bottom-auto.md\\:top-1\\/2.md\\:left-1\\/2.md\\:-translate-x-1\\/2.md\\:-translate-y-1\\/2.px-6.py-6.rounded-t-3xl.md\\:rounded-3xl.shadow-lg.bg-white.dark\\:bg-neutral-800.max-h-screen.overflow-y-auto.overflow-x-hidden.pb-\\[var\\(--is-mobile-pb\\)\\].md\\:pb-\\[var\\(--is-mobile-pb-md\\)\\] > div > div.h-96.w-full.overflow-hidden.rounded-2xl.bg-gray-100.dark\\:bg-neutral-900 > div > p")
        ) {
            console.log("Lora list not loaded yet, waiting...");
            await sleepBrowser(10);
        }
        // await waitForAndQuerySelector("div.flex.outline-none.flex-col.items-center.gap-4.w-full.md\\:w-\\[400px\\].min-h-\\[200px\\].absolute.bottom-0.md\\:bottom-auto.md\\:top-1\\/2.md\\:left-1\\/2.md\\:-translate-x-1\\/2.md\\:-translate-y-1\\/2.px-6.py-6.rounded-t-3xl.md\\:rounded-3xl.shadow-lg.bg-white.dark\\:bg-neutral-800.max-h-screen.overflow-y-auto.overflow-x-hidden.pb-\\[var\\(--is-mobile-pb\\)\\].md\\:pb-\\[var\\(--is-mobile-pb-md\\)\\] > div > div.h-96.w-full.overflow-hidden.rounded-2xl.bg-gray-100.dark\\:bg-neutral-900 > div > div > div:nth-child(2) > div > div > div")
        await sleepBrowser(500);
        if(document.querySelector('div[data-testid="virtuoso-item-list"]')) {
            const loraListElement = document.querySelector('div[data-testid="virtuoso-item-list"]')
            console.log("List loaded")

            return [...loraListElement.children].map(u=>{
                return {
                    name: u.querySelector("h3").innerText.trim(),
                    image: u.querySelector("img").src,
                    tags: [...u.querySelectorAll("div > div > .rounded-md")].map(u=>u?.innerText.trim()).filter(u=>u),
                }
            })
        } else {
            return [];            
        }
    })
    await page.keyboard.press('Escape');
    return loraList;
}

// Lora search cache
const loraSearchCache = new Map();
const LORA_CACHE_FILE = path.join(__dirname,'lora_cache.json');

// Load cache from file on startup
function loadLoraCache() {
    try {
        const data = fs.readFileSync(LORA_CACHE_FILE, 'utf8');
        const parsedCache = JSON.parse(data);
        for (const key in parsedCache) {
            loraSearchCache.set(key, parsedCache[key]);
        }
        console.log(`Lora cache loaded from ${LORA_CACHE_FILE}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File does not exist, create it with an empty JSON object
            fs.writeFileSync(LORA_CACHE_FILE, '{}', 'utf8');
            console.log(`Lora cache file created: ${LORA_CACHE_FILE}`);
        } else {
            console.warn(`Failed to load Lora cache from ${LORA_CACHE_FILE}: ${error.message}`);
        }
    }
}

// Save cache to file
function saveLoraCache() {
    const cacheToSave = Object.fromEntries(loraSearchCache);
    try {
        fs.writeFileSync(LORA_CACHE_FILE, JSON.stringify(cacheToSave), 'utf8');
        console.log(`Lora cache saved to ${LORA_CACHE_FILE}`);
    } catch (error) {
        console.error(`Failed to save Lora cache to ${LORA_CACHE_FILE}: ${error.message}`);
    }
}

loadLoraCache();
// --- Queue Processing Function ---
async function processQueue() {
    if (processing || jobQueue.length === 0) return;

    const job = jobQueue.shift();
    const { prompt, loraName, imageId, res, emitter } = job;

    if (!generationPage) {
        jobQueue.unshift(job);
        console.log("Page not ready, waiting 5 seconds...");
        setTimeout(processQueue, 5000);
        return;
    }

    processing = true;

    try {
        if (loraName) {
            if (oldLoraName !== loraName) {
                if (oldLoraName) await removeLora(generationPage);
                const loraAdded = await addLora(loraName, generationPage);
                if (!loraAdded) {
                    console.log("Failed to add Lora, requeuing job.");
                    jobQueue.unshift({...job, loraName: null}); // Re-add the job to the front of the queue
                    processing = false;
                    setTimeout(processQueue, 5000); // Try again after 5 seconds
                    return;
                }
                oldLoraName = loraName;
            }
        } else if (oldLoraName) {
            await removeLora(generationPage);
            oldLoraName = null;
        }

        res.send({
            success: true,
            imageId,
            imageUrl: `${API_URL}/${imageId}.jpg`,
            statusUrl: `${API_URL}/status/${imageId}`,
        });

        await createImageJob(decodeURIComponent(prompt), generationPage, emitter, imageId);
    } catch (error) {
        console.error("Error generating image:", error);
        updateImageStatus(imageId, 'FAILED', error.message);
        res.status(500).send({ success: false, error: "Failed to generate image." });

        // Restart the page
        console.log("Restarting the page after an error");
        try {
            await generationPage.close();
            const { browser: newBrowser, page: newPage } = await connect({ headless: false, args: [], customConfig: {}, turnstile: true, connectOption: {}, disableXvfb: false, ignoreAllFlags: false });
            generationPage = newPage;
            await onStart(generationPage);
            console.log("Page restarted successfully.");
        } catch (restartError) {
            console.error("Failed to restart the page:", restartError);
            // Handle the restart error as needed
        }
    } finally {
        processing = false;
        processQueue();
    }
}

async function processLoraSearchQueue() {
    if (loraSearchProcessing || loraSearchQueue.length === 0) return;

    const job = loraSearchQueue.shift();
    const { query, res, searchId } = job;

    loraSearchProcessing = true;

    try {
        // Check if the result is cached
        if (loraSearchCache.has(query)) {
            console.log(`Using cached result for Lora search: ${query}`);
            const cachedResult = loraSearchCache.get(query);
            res.send(cachedResult);
            return;
        }

        // Ensure the Lora search page is available
        if (!loraSearchPage) {
            console.log("Lora search page not ready, requeuing...");
            loraSearchQueue.unshift(job); // Re-add the job to the front of the queue
            loraSearchProcessing = false;
            setTimeout(processLoraSearchQueue, 5000); // Try again after 5 seconds
            return;
        }

        // Set a timeout for the Lora search
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error("Lora search timed out"));
            }, 5000); // 5 seconds timeout
        });

        // Perform the Lora search with a timeout
        const loraListPromise = searchLoras(query, loraSearchPage);

        try {
            const loraList = await Promise.race([loraListPromise, timeoutPromise]);

            clearTimeout(timeoutId); // Clear the timeout if the search completes in time

            // Cache the result
            loraSearchCache.set(query, loraList);
            saveLoraCache(); // Save the cache after updating it
            res.send(loraList); // Send the results back to the client
        } catch (error) {
            console.error("Error searching for Lora:", error);

            // Restart the page and click the button
            console.log("Restarting the page and clicking the button");
            await loraSearchPage.close();
            const { page: newLoraSearchPage } = await connect({ headless: false, args: [], customConfig: {}, turnstile: true, connectOption: {}, disableXvfb: false, ignoreAllFlags: false });
            loraSearchPage = newLoraSearchPage;
            await onStart(loraSearchPage);

            res.send([]); // Send an empty array back to the client
        }
    } catch (error) {
        console.error("Error searching for Lora:", error);
        res.status(500).send({ error: "Failed to search for Lora." });
    } finally {
        loraSearchProcessing = false;
        processLoraSearchQueue(); // Process the next item in the queue
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
    app.use('/search-loras', apiKeyCheck);
    app.use('/generateImage', apiKeyCheck);

    app.get('/health', (req, res) => res.send({ status: 'OK' }));

    app.get('/status/:imageId', (req, res) => {
        const { imageId } = req.params;
        const status = imageStatuses[imageId] || { status: 'NOT_FOUND' };
        res.send(status);
    });

    app.get('/search-loras', async (req, res) => {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send({ error: "Query parameter is required." });
        }

        const loraName = decodeURIComponent(query);
        console.log("Searching for Lora:", loraName);

        const searchId = generateImageId(); // Generate a unique ID for the search
        loraSearchQueue.push({ query: loraName, res, searchId }); // Add the search to the queue
        processLoraSearchQueue(); // Start processing the queue
    })

    app.get('/generateImage', async (req, res) => {
         if (jobQueue.length >= MAX_QUEUE_SIZE) {
            return res.status(429).send({ error: "Server is busy. Please try again later." });
        }

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
    generationPage = newPage;
    await onStart(generationPage);

    // Create a second page for Lora searches
    const { page: newLoraSearchPage } = await connect({ headless: false, args: [], customConfig: {}, turnstile: true, connectOption: {}, disableXvfb: false, ignoreAllFlags: false });
    loraSearchPage = newLoraSearchPage;
    await onStart(loraSearchPage);

    const emitter = new events.EventEmitter();

    // Expose function for preview updates
    const handlePreviewUpdate = async (data) => {
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
    };

    const debouncedHandlePreviewUpdate = debounce(handlePreviewUpdate, 200); // Adjust the delay as needed

    await generationPage.exposeFunction('handlePreviewUpdate', debouncedHandlePreviewUpdate);

    await generationPage.evaluate(() => {
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
