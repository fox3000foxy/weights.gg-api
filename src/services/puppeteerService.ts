import { connect } from "puppeteer-real-browser";
import type { Page, Browser } from "rebrowser-puppeteer-core";
import { EVENT_TYPES, type ConnectOptions, type ImageGenerationResult } from "../types";
import config from "../config";
import * as events from "events";
import { PreviewHandler } from "../handlers/previewHandler";
import ImageService from "./imageService";
import StatusService from "./statusService";

export class PuppeteerService {
  public generationPage: Page | null = null;
  public loraSearchPage: Page | null = null;
  private browser: Browser | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private idleTimeoutMs = 15 * 1000; // 3 minutes
  private headless: boolean;
  public emitter: events.EventEmitter;

  private imageService: ImageService; // Replace with actual type if available
  private statusService: StatusService; // Replace with actual type if available

  constructor(imageService: ImageService, statusService: StatusService) {
    this.headless = process.env.HEADLESS === "true";
    this.imageService = imageService;
    this.statusService = statusService;
    this.emitter = new events.EventEmitter(); // <--- ici, une seule fois
  }

  private resetIdleTimer() {
    console.log("Resetting idle timer.");
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.close().then(() => {
        this.generationPage = null;
        this.loraSearchPage = null;
        this.browser = null;
        console.log("Browser closed due to inactivity.");
      });
    }, this.idleTimeoutMs);
  }

  public async ensureInitialized(): Promise<void> {
    if (!this.browser || !this.generationPage || !this.loraSearchPage) {
      await this.initialize();
        await Promise.all([
          this.onStart(
            this.generationPage as Page,
            config.WEIGHTS_GG_COOKIE,
          ),
          this.onStart(
            this.loraSearchPage as Page,
            config.WEIGHTS_GG_COOKIE,
          ),
        ]);
      // You may need to call onStart here with the cookie if needed
    }
    this.resetIdleTimer();
  }

  public async initialize(): Promise<void> {
    const connectOptions: ConnectOptions = {
      headless: this.headless,
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
        targetCPU: 30, // Limite l'utilisation CPU
        maxConcurrency: 2, // Limite le nombre d'opérations concurrentes
      },
      turnstile: true,
      connectOption: {},
      disableXvfb: false,
      ignoreAllFlags: false,
    };

    const { browser } = await connect(connectOptions);
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

    this.resetIdleTimer();
  }

  public async exposeFunctions(generationPage: Page): Promise<void> {
    console.log("Exposing functions to the page.");

    // N'ajoute les listeners qu'une seule fois (évite les doublons)
    if (this.emitter.listenerCount(EVENT_TYPES.PREVIEW_UPDATE) === 0) {
      this.emitter.on(EVENT_TYPES.PREVIEW_UPDATE, (data) => data);
    }
    if (this.emitter.listenerCount(EVENT_TYPES.STATUS_UPDATE) === 0) {
      this.emitter.on(EVENT_TYPES.STATUS_UPDATE, (data) => {
        this.resetIdleTimer();
        if (!this.statusService) throw new Error("Status service not initialized.");
        this.statusService.updateImageStatus(data.imageId, data.status, data.error);
      });
    }

    const previewHandler = new PreviewHandler(this.imageService, this.emitter);

    await generationPage.exposeFunction(
      "handlePreviewUpdate",
      (data: ImageGenerationResult) => previewHandler.handlePreviewUpdate(data),
    );
    console.log("Functions exposed to the page.");

    await generationPage.evaluate(() => {
      window.addEventListener("previewUpdate", (event: Event) => {
        window.handlePreviewUpdate((event as CustomEvent).detail);
      });
    });
  }

  private async _setupPage(page: Page): Promise<void> {
    await page.setCacheEnabled(false); // Désactiver le cache
    await page.setRequestInterception(true);
    await page.setViewport({ width: 660, height: 400 });
    const blockedResources = new Set(["stylesheet", "font", "media"]);
    const blockedDomains = new Set([
      "google-analytics.com",
      "googletagmanager.com",
    ]);

    page.on("request", (request) => {
      const shouldBlock =
        blockedResources.has(request.resourceType()) ||
        blockedDomains.has(new URL(request.url()).hostname);

      if (shouldBlock) {
        request.abort();
      } else {
        request.continue();
      }
    });
  }

  public async onStart(page: Page, cookie: string): Promise<void> {
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
        const button = document.querySelector(
          "#__next > main > div > div > div > div.my-4.flex.w-full.flex-col.gap-8 > div:nth-child(4) > div:nth-child(1) > div.flex.w-full.gap-2 > button",
        );
        if (button) {
          (button as HTMLElement).click();
          return true;
        }
        return false;
      });

      await this.exposeFunctions(page);

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

      await this._setupPage(newPage);

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
    this.browser = null;
    this.generationPage = null;
    this.loraSearchPage = null;
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }
}

export default PuppeteerService;
