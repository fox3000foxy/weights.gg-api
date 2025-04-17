"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PuppeteerService = void 0;
const puppeteer_real_browser_1 = require("puppeteer-real-browser");
class PuppeteerService {
    constructor() {
        this.generationPage = null;
        this.loraSearchPage = null;
    }
    async initialize() {
        const connectOptions = {
            headless: false,
            args: [],
            customConfig: {},
            turnstile: true,
            connectOption: {},
            disableXvfb: false,
            ignoreAllFlags: false
        };
        const [{ page: newPage }, { page: newLoraSearchPage }] = await Promise.all([
            (0, puppeteer_real_browser_1.connect)(connectOptions),
            (0, puppeteer_real_browser_1.connect)(connectOptions)
        ]);
        this.generationPage = newPage;
        this.loraSearchPage = newLoraSearchPage;
    }
    async onStart(page, cookie) {
        await page.goto("https://weights.gg/create");
        await page.setCookie({
            name: 'next-auth.session-token',
            value: cookie,
            secure: true,
            httpOnly: false
        });
        await page.goto("https://weights.gg/create", { waitUntil: "load" });
        await page.evaluate(() => {
            const button = document.querySelector("#__next > main > div > div > div > div.my-4.flex.w-full.flex-col.gap-8 > div:nth-child(4) > div:nth-child(1) > div.flex.w-full.gap-2 > button");
            if (button) {
                button.click();
            }
        });
        console.log("Context ready");
    }
    async restartPage(page, cookie) {
        try {
            await page.close();
            const { page: newPage } = await (0, puppeteer_real_browser_1.connect)({
                headless: false,
                args: [],
                customConfig: {},
                turnstile: true,
                connectOption: {},
                disableXvfb: false,
                ignoreAllFlags: false
            });
            return newPage;
        }
        catch (restartError) {
            console.error("Failed to restart the page:", restartError);
            throw restartError;
        }
    }
    getGenerationPage() {
        return this.generationPage;
    }
    getLoraSearchPage() {
        return this.loraSearchPage;
    }
}
exports.PuppeteerService = PuppeteerService;
exports.default = PuppeteerService;
