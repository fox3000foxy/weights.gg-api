"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoraService = void 0;
const fs = __importStar(require("fs"));
class LoraService {
    constructor(config) {
        this.config = config;
        this.loraSearchCache = new Map();
        this.loadLoraCache();
    }
    async addLora(loraName, page) {
        try {
            await page.evaluate(async () => {
                const sleepBrowser = (ms) => new Promise(r => setTimeout(r, ms));
                async function waitForAndQuerySelector(selector) {
                    while (!document.querySelector(selector)) {
                        console.log(`${selector} not loaded yet, waiting...`);
                        await sleepBrowser(10);
                    }
                    return document.querySelector(selector);
                }
                const loraButton = await waitForAndQuerySelector("button.hover-scale.flex.h-7.w-full.items-center.gap-2.rounded-lg.bg-gray-100.px-2");
                loraButton?.click();
                const element = await waitForAndQuerySelector('[id^="«r"]');
                element?.click();
                element?.focus();
            });
            console.log("Element focused");
            await page.type('[id^="«r"]', decodeURIComponent(loraName));
            await page.keyboard.press('Enter');
            console.log("Lora name entered");
            const loraFound = await page.evaluate(async () => {
                const sleepBrowser = (ms) => new Promise(r => setTimeout(r, ms));
                async function waitForAndQuerySelector(selector, timeout = 5000) {
                    const startTime = Date.now();
                    while (!document.querySelector(selector)) {
                        if (Date.now() - startTime > timeout) {
                            return null;
                        }
                        console.log(`${selector} not loaded yet, waiting...`);
                        await sleepBrowser(10);
                    }
                    return document.querySelector(selector);
                }
                const loraSelection = await waitForAndQuerySelector("div.flex.outline-none.flex-col.items-center.gap-4.w-full.md\\:w-\\[400px\\].min-h-\\[200px\\].absolute.bottom-0.md\\:bottom-auto.md\\:top-1\\/2.md\\:left-1\\/2.md\\:-translate-x-1\\/2.md\\:-translate-y-1\\/2.px-6.py-6.rounded-t-3xl.md\\:rounded-3xl.shadow-lg.bg-white.dark\\:bg-neutral-800.max-h-screen.overflow-y-auto.overflow-x-hidden.pb-\\[var\\(--is-mobile-pb\\)\\].md\\:pb-\\[var\\(--is-mobile-pb-md\\)\\] > div > div.h-96.w-full.overflow-hidden.rounded-2xl.bg-gray-100.dark\\:bg-neutral-900 > div > div > div:nth-child(2) > div > div > div", 5000);
                if (loraSelection) {
                    loraSelection.click();
                    await waitForAndQuerySelector("#imagegen-input");
                    return true;
                }
                return false;
            });
            if (loraFound) {
                console.log("Lora selected");
            }
            else {
                console.log("Lora not found, skipping selection.");
                await page.keyboard.press('Escape');
                return false;
            }
        }
        catch (error) {
            console.error("Error adding Lora:", error);
        }
        return true;
    }
    async removeLora(page) {
        await page.evaluate(() => {
            const button = document.querySelector("div.-mb-2.-mt-4.flex.w-full > div > a > button");
            if (button) {
                button.click();
            }
        });
    }
    async searchLoras(loraName, page) {
        await page.evaluate(async (loraName) => {
            const sleepBrowser = (ms) => new Promise(r => setTimeout(r, ms));
            const loraButton = document.querySelector("button.hover-scale.flex.h-7.w-full.items-center.gap-2.rounded-lg.bg-gray-100.px-2");
            loraButton?.click();
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
        const loraList = await page.evaluate(async () => {
            const sleepBrowser = (ms) => new Promise(r => setTimeout(r, ms));
            while (!document.querySelector("div.flex.outline-none.flex-col.items-center.gap-4.w-full.md\\:w-\\[400px\\].min-h-\\[200px\\].absolute.bottom-0.md\\:bottom-auto.md\\:top-1\\/2.md\\:left-1\\/2.md\\:-translate-x-1\\/2.md\\:-translate-y-1\\/2.px-6.py-6.rounded-t-3xl.md\\:rounded-3xl.shadow-lg.bg-white.dark\\:bg-neutral-800.max-h-screen.overflow-y-auto.overflow-x-hidden.pb-\\[var\\(--is-mobile-pb\\)\\].md\\:pb-\\[var\\(--is-mobile-pb-md\\)\\] > div > div.h-96.w-full.overflow-hidden.rounded-2xl.bg-gray-100.dark\\:bg-neutral-900 > div > div > div:nth-child(2) > div > div > div")
                && !document.querySelector("div.h-96.w-full.overflow-hidden.rounded-2xl.bg-gray-100.dark\\:bg-neutral-900 > div > p")) {
                console.log("Lora list not loaded yet, waiting...");
                await sleepBrowser(10);
            }
            await sleepBrowser(500);
            const listElement = document.querySelector('div[data-testid="virtuoso-item-list"]');
            if (listElement) {
                console.log("List loaded");
                return Array.from(listElement.children).map(child => ({
                    name: child.querySelector("h3")?.innerText.trim() || '',
                    image: child.querySelector("img")?.src || '',
                    tags: Array.from(child.querySelectorAll("div > div > .rounded-md"))
                        .map(tag => tag?.innerText.trim())
                        .filter(Boolean)
                }));
            }
            return [];
        });
        await page.keyboard.press('Escape');
        return loraList;
    }
    loadLoraCache() {
        try {
            const data = fs.readFileSync(this.config.LORA_CACHE_FILE, 'utf8');
            const parsedCache = JSON.parse(data);
            for (const key in parsedCache) {
                this.loraSearchCache.set(key, parsedCache[key]);
            }
            console.log(`Lora cache loaded from ${this.config.LORA_CACHE_FILE}`);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                fs.writeFileSync(this.config.LORA_CACHE_FILE, '{}', 'utf8');
                console.log(`Lora cache file created: ${this.config.LORA_CACHE_FILE}`);
            }
            else {
                console.warn(`Failed to load Lora cache from ${this.config.LORA_CACHE_FILE}: ${error.message}`);
            }
        }
    }
    saveLoraCache() {
        const cacheToSave = Object.fromEntries(this.loraSearchCache);
        try {
            fs.writeFileSync(this.config.LORA_CACHE_FILE, JSON.stringify(cacheToSave), 'utf8');
            console.log(`Lora cache saved to ${this.config.LORA_CACHE_FILE}`);
        }
        catch (error) {
            console.error(`Failed to save Lora cache to ${this.config.LORA_CACHE_FILE}: ${error.message}`);
        }
    }
}
exports.LoraService = LoraService;
exports.default = LoraService;
