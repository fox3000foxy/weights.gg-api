import { connect } from "puppeteer-real-browser";
import type { Page, Browser } from "rebrowser-puppeteer-core";
import type { ConnectOptions } from "../types";

export class PuppeteerService {
  public generationPage: Page | null = null;
  public loraSearchPage: Page | null = null;
  private browser: Browser | null = null;

  constructor() {}

  public async initialize(): Promise<void> {
    const connectOptions: ConnectOptions = {
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
      ],
      customConfig: {},
      turnstile: true,
      connectOption: {},
      disableXvfb: false,
      ignoreAllFlags: false,
    };

    const { browser } = await connect(connectOptions);
    this.browser = browser;

    // Créer deux contextes isolés
    const loraContext = await browser.createBrowserContext();
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

  private async _optimizePage(page: Page, options?: { blockImages?: boolean }) {
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const blockTypes = ["stylesheet", "font", "media"];
      if (options?.blockImages) {
        blockTypes.push("image");
      }
      if (blockTypes.includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });
  }

  private async _setupPage(page: Page, options?: { blockImages?: boolean }): Promise<void> {
    // Configuration de base
    await page.setDefaultNavigationTimeout(30000);
    await page.setDefaultTimeout(30000);
    await page.setViewport({ width: 1280, height: 800 });

    // Optimisation si nécessaire
    if (options?.blockImages) {
      await this._optimizePage(page, options);
    }
  }

  public async onStart(page: Page, cookie: string): Promise<void> {
    try {
      await page.goto("https://weights.gg/create", {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      await page.setCookie({
        name: "next-auth.session-token",
        value: cookie,
        secure: true,
        httpOnly: false,
      });

      await page.goto("https://weights.gg/create", {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      const success = await page.evaluate(() => {
        const button = document.querySelector(
          "#__next > main > div > div > div > div.my-4.flex.w-full.flex-col.gap-8 > div:nth-child(4) > div:nth-child(1) > div.flex.w-full.gap-2 > button"
        );
        if (button) {
          (button as HTMLElement).click();
          return true;
        }
        return false;
      });

      if (!success) {
        console.warn("Button not found or click failed");
      }
    } catch (error) {
      console.error("Error during page initialization:", error);
      throw error;
    }
  }

  public async restartPage(oldPage: Page): Promise<Page> {
    if (!this.browser) throw new Error("Browser not initialized.");

    try {
      const context = await this.browser.createBrowserContext();
      const newPage = await context.newPage();

      await this._setupPage(newPage, {
        blockImages: oldPage === this.loraSearchPage,
      });

      if (oldPage === this.loraSearchPage) {
        await oldPage.browserContext().close();
        this.loraSearchPage = newPage;
      } else if (oldPage === this.generationPage) {
        await oldPage.browserContext().close();
        this.generationPage = newPage;
      }

      return newPage;
    } catch (err) {
      console.error("Failed to restart the page:", err);
      throw err;
    }
  }

  public getGenerationPage(): Page | null {
    return this.generationPage;
  }

  public getLoraSearchPage(): Page | null {
    return this.loraSearchPage;
  }

  public async close(): Promise<void> {
    try {
      await this.browser?.close();
    } catch (err) {
      console.warn("Error while closing browser:", err);
    }
  }
}

export default PuppeteerService;
