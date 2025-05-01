import { connect } from "puppeteer-real-browser";
import type { Page, Browser } from "rebrowser-puppeteer-core";
import { EVENT_TYPES, TYPES, type ConnectOptions, type ImageGenerationResult } from "../types";
import config from "../config";
import * as events from "events";
import { PreviewHandler } from "../handlers/previewHandler";
import { IImageService } from "./imageService";
import { IStatusService } from "./statusService";
import { inject, injectable } from "inversify";

declare global {
  interface Window {
    handlePreviewUpdate: (data: ImageGenerationResult) => void;
  }
}

export type PageType = "generation" | "loraSearch";
interface PageContext {
  page: Page | null;
  idleTimer: NodeJS.Timeout | null;
  lastUsed: number;
}

export interface IPuppeteerService {
  generationPage: Page | null;
  loraSearchPage: Page | null;
  emitter: events.EventEmitter;
  ensurePageInitialized(pageType: PageType): Promise<Page>;
  initialize(): Promise<void>;
  ensureInitialized(): Promise<void>;
  exposeFunctions(generationPage: Page): Promise<void>;
  onStart(page: Page, cookie: string): Promise<void>;
  restartPage(oldPage: Page): Promise<Page>;
  closePage(pageType: PageType): Promise<void>;
  close(): Promise<void>;
  getGenerationPageReady(): Promise<Page>;
  getLoraSearchPageReady(): Promise<Page>;
}

@injectable()
export class PuppeteerService implements IPuppeteerService {
  private browser: Browser | null = null;
  private idleTimeoutMs = 15 * 1000; // 15 seconds idle timeout
  private headless: boolean;
  public emitter: events.EventEmitter;

  private pageContexts: Record<PageType, PageContext> = {
    generation: { page: null, idleTimer: null, lastUsed: 0 },
    loraSearch: { page: null, idleTimer: null, lastUsed: 0 },
  };

  private imageService: IImageService;
  private statusService: IStatusService;

  constructor(
    @inject(TYPES.ImageService) imageService: IImageService,
    @inject(TYPES.StatusService) statusService: IStatusService
  ) {
    this.headless = process.env.HEADLESS === "true";
    this.imageService = imageService;
    this.statusService = statusService;
    this.emitter = new events.EventEmitter();
  }

  // Getters that maintain backward compatibility
  public get generationPage(): Page | null {
    return this.pageContexts.generation.page;
  }

  public set generationPage(page: Page | null) {
    this.pageContexts.generation.page = page;
  }

  public get loraSearchPage(): Page | null {
    return this.pageContexts.loraSearch.page;
  }

  public set loraSearchPage(page: Page | null) {
    this.pageContexts.loraSearch.page = page;
  }

  private resetIdleTimer(pageType: PageType) {
    console.log(`Resetting idle timer for ${pageType} page.`);
    const context = this.pageContexts[pageType];
    
    if (context.idleTimer) {
      clearTimeout(context.idleTimer);
    }
    
    context.lastUsed = Date.now();
    context.idleTimer = setTimeout(() => {
      this.closePage(pageType).then(() => {
        console.log(`${pageType} page closed due to inactivity.`);
      });
    }, this.idleTimeoutMs);
  }

  /**
   * Ensures a specific page type is initialized
   */
  public async ensurePageInitialized(pageType: PageType): Promise<Page> {
    const context = this.pageContexts[pageType];
    
    if (!this.browser) {
      await this.initializeBrowser();
    }
    
    if (!context.page) {
      await this.initializePage(pageType);
      await this.onStart(this.pageContexts[pageType].page as Page, config.WEIGHTS_GG_COOKIE);
    }
    
    this.resetIdleTimer(pageType);
    return context.page as Page;
  }

  /**
   * Initializes the browser without creating any pages
   */
  private async initializeBrowser(): Promise<void> {
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
        targetCPU: 30,
        maxConcurrency: 2,
      },
      turnstile: true,
      connectOption: {},
      disableXvfb: false,
      ignoreAllFlags: false,
    };

    const { browser } = await connect(connectOptions);
    this.browser = browser;
  }
  
  /**
   * Initializes a specific page type
   */
  private async initializePage(pageType: PageType): Promise<void> {
    if (!this.browser) {
      throw new Error("Browser not initialized");
    }
    
    const context = pageType === "generation" 
      ? await this.browser.createBrowserContext()
      : await this.browser.defaultBrowserContext();
      
    const page = await context.newPage();
    await this._setupPage(page);
    
    this.pageContexts[pageType].page = page;
    this.resetIdleTimer(pageType);
  }

  // For backward compatibility
  public async initialize(): Promise<void> {
    if (!this.browser) {
      await this.initializeBrowser();
    }
    
    // Initialize both pages if they're not already initialized
    if (!this.pageContexts.generation.page) {
      await this.initializePage("generation");
    }
    
    if (!this.pageContexts.loraSearch.page) {
      await this.initializePage("loraSearch");
    }
    
    // Start both pages
    await Promise.all([
      this.onStart(this.generationPage as Page, config.WEIGHTS_GG_COOKIE),
      this.onStart(this.loraSearchPage as Page, config.WEIGHTS_GG_COOKIE),
    ]);
  }

  // For backward compatibility
  public async ensureInitialized(): Promise<void> {
    if (!this.browser || !this.generationPage || !this.loraSearchPage) {
      await this.initialize();
    }
    
    // Reset both timers
    this.resetIdleTimer("generation");
    this.resetIdleTimer("loraSearch");
  }

  public async exposeFunctions(generationPage: Page): Promise<void> {
    console.log("Exposing functions to the page.");

    // N'ajoute les listeners qu'une seule fois (évite les doublons)
    if (this.emitter.listenerCount(EVENT_TYPES.PREVIEW_UPDATE) === 0) {
      this.emitter.on(EVENT_TYPES.PREVIEW_UPDATE, (data) => data);
    }
    if (this.emitter.listenerCount(EVENT_TYPES.STATUS_UPDATE) === 0) {
      this.emitter.on(EVENT_TYPES.STATUS_UPDATE, (data) => {
        // Reset the timer for the generation page when we get a status update
        this.resetIdleTimer("generation");
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

    // Determine which page type is being restarted
    let pageType: PageType | null = null;
    
    if (oldPage === this.pageContexts.generation.page) {
      pageType = "generation";
    } else if (oldPage === this.pageContexts.loraSearch.page) {
      pageType = "loraSearch";
    }
    
    if (!pageType) {
      throw new Error("Unidentified page cannot be restarted");
    }

    try {
      const context = await this.browser.createBrowserContext();
      const newPage = await context.newPage();
      await this._setupPage(newPage);

      // Close old page context
      await oldPage.browserContext().close();
      
      // Update the page reference
      this.pageContexts[pageType].page = newPage;
      this.resetIdleTimer(pageType);
      
      return newPage;
    } catch (err) {
      console.error("Failed to restart the page:", err);
      throw err;
    }
  }

  /**
   * Close a specific page type
   */
  public async closePage(pageType: PageType): Promise<void> {
    const context = this.pageContexts[pageType];
    
    if (context.page) {
      try {
        await context.page.browserContext()?.close();
      } catch (err) {
        await err;
        // console.warn(`Error closing ${pageType} page:`, err);
      }
      
      context.page = null;
    }
    

    
    if (context.idleTimer) {
      clearTimeout(context.idleTimer);
      context.idleTimer = null;
    }
    
    // If all pages are closed, close the browser too
    if (!this.pageContexts.generation.page && !this.pageContexts.loraSearch.page) {
      await this.closeBrowser();
    }
  }
  
  /**
   * Close the browser
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (err) {
        console.warn("Error closing browser:", err);
      }
      
      this.browser = null;
    }
  }

  // Legacy method for backward compatibility
  public async close(): Promise<void> {
    // Close both page types
    await Promise.all([
      this.closePage("generation"),
      this.closePage("loraSearch"),
    ]);
    
    // Browser will be closed by closePage if all pages are closed
  }
  
  // Helpers for specific page types
  public async getGenerationPageReady(): Promise<Page> {
    return this.ensurePageInitialized("generation");
  }
  
  public async getLoraSearchPageReady(): Promise<Page> {
    return this.ensurePageInitialized("loraSearch");
  }
}

export default PuppeteerService;