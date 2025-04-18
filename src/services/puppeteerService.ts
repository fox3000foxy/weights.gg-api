import { connect } from "puppeteer-real-browser";
import type { Page } from "rebrowser-puppeteer-core";
import type { ConnectOptions } from "../types";

export class PuppeteerService {
  public generationPage: Page | null;
  public loraSearchPage: Page | null;

  constructor() {
    this.generationPage = null;
    this.loraSearchPage = null;
  }

  public async initialize(): Promise<void> {
    const connectOptions: ConnectOptions = {
      headless: false,
      args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
      ],
      customConfig: {},
      turnstile: true,
      connectOption: {},
      disableXvfb: false,
      ignoreAllFlags: false,
    };

    const [{ page: newPage }, { page: newLoraSearchPage }] = await Promise.all([
      connect(connectOptions),
      connect(connectOptions),
    ]);

    this.generationPage = newPage;
    this.loraSearchPage = newLoraSearchPage;
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

  public async restartPage(page: Page): Promise<Page> {
    try {
      await page.close();
      const { page: newPage } = await connect({
        headless: false,
        args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
        ],
        customConfig: {},
        turnstile: true,
        connectOption: {},
        disableXvfb: false,
        ignoreAllFlags: false,
      });
      return newPage;
    } catch (restartError) {
      console.error("Failed to restart the page:", restartError);
      throw restartError;
    }
  }

  public getGenerationPage(): Page | null {
    return this.generationPage;
  }

  public getLoraSearchPage(): Page | null {
    return this.loraSearchPage;
  }
}

export default PuppeteerService;
