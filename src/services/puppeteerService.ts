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
      headless: false, // Modern headless mode (better performance)
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-accelerated-2d-canvas",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-extensions",
        "--disable-sync",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-first-run",
        "--no-zygote",
        "--safebrowsing-disable-auto-update",
        // "--single-process",
      ],
      customConfig: {},
      turnstile: true,
      connectOption: {},
      disableXvfb: false,
      ignoreAllFlags: false,
    };

    const { browser } = await connect(connectOptions);
    this.browser = browser;

    // Crée deux pages dans le même navigateur
    const [loraSearchPage, generationPage] = await Promise.all([
      browser.newPage(),
      browser.newPage(),
    ]);

    // Optimiser la page de recherche (bloquer les ressources inutiles)
    await this._optimizePage(loraSearchPage, { blockImages: true });

    this.generationPage = generationPage;
    this.loraSearchPage = loraSearchPage;
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

  public async onStart(page: Page, cookie: string): Promise<void> {
    await page.goto("https://weights.gg/create");

    await page.setCookie({
      name: "next-auth.session-token",
      value: cookie,
      secure: true,
      httpOnly: false,
    });

    await page.goto("https://weights.gg/create", { waitUntil: "load" });

    await page.evaluate(() => {
      const button = document.querySelector(
        "#__next > main > div > div > div > div.my-4.flex.w-full.flex-col.gap-8 > div:nth-child(4) > div:nth-child(1) > div.flex.w-full.gap-2 > button",
      );
      if (button) {
        (button as HTMLElement).click();
      }
    });
  }

  public async restartPage(oldPage: Page): Promise<Page> {
    if (!this.browser) throw new Error("Browser not initialized.");

    try {
      await oldPage.close();
      const newPage = await this.browser.newPage();

      // Appliquer l'optimisation selon l'ancien rôle
      if (oldPage === this.loraSearchPage) {
        await this._optimizePage(newPage, { blockImages: true });
        this.loraSearchPage = newPage;
      } else if (oldPage === this.generationPage) {
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
