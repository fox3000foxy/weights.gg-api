"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PuppeteerService = void 0;
const puppeteer_real_browser_1 = require("puppeteer-real-browser");
class PuppeteerService {
    constructor() {
        this.generationPage = null;
        this.loraSearchPage = null;
        this.browser = null;
    }
    async initialize() {
        const connectOptions = {
            headless: false,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--enable-features=NetworkService",
                "--disable-background-timer-throttling",
                "--disable-backgrounding-occluded-windows",
                "--disable-renderer-backgrounding",
                "--disable-accelerated-2d-canvas",
                "--disable-default-apps",
                "--disable-extensions",
                "--disable-sync",
                "--metrics-recording-only",
                "--mute-audio",
                "--no-first-run",
                "--no-zygote",
                "--safebrowsing-disable-auto-update",
                "--disable-javascript-harmony-shipping",
                "--disable-site-isolation-trials",
                "--disable-features=IsolateOrigins,site-per-process",
                "--disable-threaded-scrolling",
                "--disable-threaded-animation",
                "--disable-composited-antialiasing",
            ],
            customConfig: {
                targetCPU: 30,
                maxConcurrency: 2, // Limite le nombre d'opérations concurrentes
            },
            turnstile: true,
            connectOption: {},
            disableXvfb: false,
            ignoreAllFlags: false,
        };
        const { browser } = await (0, puppeteer_real_browser_1.connect)(connectOptions);
        this.browser = browser;
        // Créer deux contextes isolés
        const loraContext = await browser.defaultBrowserContext();
        const generationContext = await browser.createBrowserContext();
        // Créer les pages dans leurs contextes respectifs
        this.loraSearchPage = await loraContext.newPage();
        this.generationPage = await generationContext.newPage();
        // Configurer les pages
        await Promise.all([
            this._setupPage(this.generationPage),
            this._setupPage(this.loraSearchPage),
        ]);
    }
    async _optimizePage(page, options) {
        // Bloquer plus de ressources non essentielles
        await page.setRequestInterception(true);
        page.on("request", (req) => {
            const blockTypes = [
                "stylesheet",
                "font",
                "media",
                "other",
                "manifest",
                "script",
                "xhr",
                "fetch", // Bloquer les fetch non essentiels
            ];
            if (options?.blockImages) {
                blockTypes.push("image");
            }
            // Liste de domaines à bloquer
            const blockedDomains = [
                "google-analytics.com",
                "googletagmanager.com",
                "doubleclick.net",
                "facebook.com",
                "analytics",
            ];
            const shouldBlock = blockTypes.includes(req.resourceType()) ||
                blockedDomains.some((domain) => req.url().includes(domain));
            if (shouldBlock) {
                // console.log(`Blocked request to: ${req.url()}`);
                req.abort();
            }
            else {
                req.continue();
            }
        });
        // Désactiver plus de fonctionnalités gourmandes en CPU
        await page.evaluate(() => {
            window.requestAnimationFrame = () => 0;
            window.cancelAnimationFrame = () => { };
            // window.setTimeout = () => 0 as number;
            // window.setInterval = () => 0 as number;
        });
    }
    async _setupPage(page, options) {
        await page.setCacheEnabled(false); // Désactiver le cache
        await page.setRequestInterception(true);
        const blockedResources = new Set(["image", "stylesheet", "font", "media"]);
        const blockedDomains = new Set([
            "google-analytics.com",
            "googletagmanager.com",
        ]);
        page.on("request", (request) => {
            const shouldBlock = blockedResources.has(request.resourceType()) ||
                blockedDomains.has(new URL(request.url()).hostname);
            if (options?.blockImages && request.resourceType() === "image") {
                request.abort();
            }
            else {
                if (shouldBlock) {
                    request.abort();
                }
                else {
                    request.continue();
                }
            }
        });
    }
    async onStart(page, cookie) {
        try {
            await page.goto("https://weights.gg/create", {
                timeout: 30000,
            });
            await page.setCookie({
                name: "next-auth.session-token",
                value: cookie,
                secure: true,
                httpOnly: false,
            });
            await page.goto("https://weights.gg/create", {
                waitUntil: "networkidle2",
                timeout: 30000,
            });
            const success = await page.evaluate(() => {
                const button = document.querySelector("#__next > main > div > div > div > div.my-4.flex.w-full.flex-col.gap-8 > div:nth-child(4) > div:nth-child(1) > div.flex.w-full.gap-2 > button");
                if (button) {
                    button.click();
                    return true;
                }
                return false;
            });
            if (!success) {
                console.warn("Button not found or click failed");
            }
        }
        catch (error) {
            console.error("Error during page initialization:", error);
            throw error;
        }
    }
    async restartPage(oldPage) {
        if (!this.browser)
            throw new Error("Browser not initialized.");
        try {
            const context = await this.browser.createBrowserContext();
            const newPage = await context.newPage();
            await this._setupPage(newPage, {
                blockImages: oldPage === this.loraSearchPage,
            });
            if (oldPage === this.loraSearchPage) {
                await oldPage.browserContext().close();
                this.loraSearchPage = newPage;
            }
            else if (oldPage === this.generationPage) {
                await oldPage.browserContext().close();
                this.generationPage = newPage;
            }
            return newPage;
        }
        catch (err) {
            console.error("Failed to restart the page:", err);
            throw err;
        }
    }
    getGenerationPage() {
        return this.generationPage;
    }
    getLoraSearchPage() {
        return this.loraSearchPage;
    }
    async close() {
        try {
            await this.browser?.close();
        }
        catch (err) {
            console.warn("Error while closing browser:", err);
        }
    }
}
exports.PuppeteerService = PuppeteerService;
exports.default = PuppeteerService;
