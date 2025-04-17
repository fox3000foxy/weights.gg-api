// --- loraService.js ---
const fs = require('fs');
const path = require('path');

class LoraService {
    constructor(config) {
        this.config = config;
        this.loraSearchCache = new Map();
        this.loadLoraCache();
    }

    async addLora(loraName, page) {
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
                return false;
            }
        } catch (error) {
            console.error("Error adding Lora:", error);
        }
        return true;
    }
    
    async removeLora(page) {
        await page.evaluate(() => {
            if(document.querySelector("div.-mb-2.-mt-4.flex.w-full > div > a > button"))
                document.querySelector("div.-mb-2.-mt-4.flex.w-full > div > a > button").click()
        });
    }

    async searchLoras(loraName, page) {
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
            &&  !document.querySelector("div.h-96.w-full.overflow-hidden.rounded-2xl.bg-gray-100.dark\\:bg-neutral-900 > div > p")
            ) {
                console.log("Lora list not loaded yet, waiting...");
                await sleepBrowser(10);
            }
            // await waitForAndQuerySelector("div.flex.outline-none.flex-col.items-center.gap-4.w-full.md\\:w-\\[400px\\].min-h-\\[200px\\].absolute.bottom-0.md\\:bottom-auto.md\\:top-1\\/2.md\\:left-1\\/2.md\\:-translate-x-1\\/2.md\\:-translate-y-1\\/2.px-6.py-6.rounded-t-3xl.md\\:rounded-3xl.shadow-lg.bg-white.dark\\:bg-neutral-800.max-h-screen.overflow-y-auto.overflow-x-hidden.pb-\\[var\\(--is-mobile-pb\\)\\].md\\:pb-\\[var\\(--is-mobile-pb-md\\)\\] > div > div.h-96.w-full.overflow-hidden.rounded-2xl.bg-gray-100.dark\\:bg-neutral-900 > div > div > div:nth-child(2) > div > div > div")
            await sleepBrowser(500);
            if(document.querySelector('div[data-testid="virtuoso-item-list"]')) {
                const loraListElement = document.querySelector('div[data-testid="virtuoso-item-list"]')
                console.log("List loaded")
    
                const loraResults = [...loraListElement.children].map(u=>{
                    return {
                        name: u.querySelector("h3").innerText.trim(),
                        image: u.querySelector("img").src,
                        tags: [...u.querySelectorAll("div > div > .rounded-md")].map(u=>u?.innerText.trim()).filter(u=>u),
                    }
                })

                return loraResults;
            } else {
                return [];            
            }
        })
        await page.keyboard.press('Escape');
        return loraList;
    }

    // Load cache from file on startup
    loadLoraCache() {
        try {
            const data = fs.readFileSync(this.config.LORA_CACHE_FILE, 'utf8');
            const parsedCache = JSON.parse(data);
            for (const key in parsedCache) {
                this.loraSearchCache.set(key, parsedCache[key]);
            }
            console.log(`Lora cache loaded from ${this.config.LORA_CACHE_FILE}`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File does not exist, create it with an empty JSON object
                fs.writeFileSync(this.config.LORA_CACHE_FILE, '{}', 'utf8');
                console.log(`Lora cache file created: ${this.config.LORA_CACHE_FILE}`);
            } else {
                console.warn(`Failed to load Lora cache from ${this.config.LORA_CACHE_FILE}: ${error.message}`);
            }
        }
    }

    // Save cache to file
    saveLoraCache() {
        const cacheToSave = Object.fromEntries(this.loraSearchCache);
        try {
            fs.writeFileSync(this.config.LORA_CACHE_FILE, JSON.stringify(cacheToSave), 'utf8');
            console.log(`Lora cache saved to ${this.config.LORA_CACHE_FILE}`);
        } catch (error) {
            console.error(`Failed to save Lora cache to ${this.config.LORA_CACHE_FILE}: ${error.message}`);
        }
    }
}

module.exports = LoraService;