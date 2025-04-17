// --- puppeteerService.js ---
const { connect } = require("puppeteer-real-browser");

class PuppeteerService {
    constructor() {
        this.generationPage = null;
        this.loraSearchPage = null;
    }

    async initialize() {
        const [
            { page: newPage },
            { page: newLoraSearchPage }
        ] = await Promise.all([
            connect({ headless: false, args: [], customConfig: {}, turnstile: true, connectOption: {}, disableXvfb: false, ignoreAllFlags: false }),
            connect({ headless: false, args: [], customConfig: {}, turnstile: true, connectOption: {}, disableXvfb: false, ignoreAllFlags: false })
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
            document.querySelector("#__next > main > div > div > div > div.my-4.flex.w-full.flex-col.gap-8 > div:nth-child(4) > div:nth-child(1) > div.flex.w-full.gap-2 > button").click()
        });
        console.log("Context ready");
    }

    async restartPage(page, cookie) {
        try {
            await page.close();
            const { browser: newBrowser, page: newPage } = await connect({ headless: false, args: [], customConfig: {}, turnstile: true, connectOption: {}, disableXvfb: false, ignoreAllFlags: false });
            return newPage;
        } catch (restartError) {
            console.error("Failed to restart the page:", restartError);
            throw restartError;
        }
    }
}

module.exports = PuppeteerService;