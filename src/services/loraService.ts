import * as fs from "fs";
import { Page } from "rebrowser-puppeteer-core";
import { Config } from "../config";
import { LoraResult } from "types";

export class LoraService {
  public config: Config;
  public loraSearchCache: Map<string, LoraResult[]>;

  constructor(config: Config) {
    this.config = config;
    this.loraSearchCache = new Map();
    this.loadLoraCache();
  }

  public async addLora(loraName: string, page: Page): Promise<boolean> {
    try {
      await page.evaluate(async () => {
        const sleepBrowser = (ms: number) =>
          new Promise((r) => setTimeout(r, ms));

        async function waitForAndQuerySelector(
          selector: string,
        ): Promise<Element | null> {
          while (!document.querySelector(selector)) {
            console.log(`${selector} not loaded yet, waiting...`);
            await sleepBrowser(10);
          }
          return document.querySelector(selector);
        }

        const loraButton = await waitForAndQuerySelector(
          "button.hover-scale.flex.h-7.w-full.items-center.gap-2.rounded-lg.bg-gray-100.px-2",
        );
        (loraButton as HTMLElement)?.click();

        const element = await waitForAndQuerySelector('[id^="«r"]');
        (element as HTMLElement)?.click();
        (element as HTMLElement)?.focus();
      });

      console.log("Element focused");

      await page.type('[id^="«r"]', decodeURIComponent(loraName));
      await page.keyboard.press("Enter");

      console.log("Lora name entered");

      const loraFound = await page.evaluate(async () => {
        const sleepBrowser = (ms: number) =>
          new Promise((r) => setTimeout(r, ms));

        async function waitForAndQuerySelector(
          selector: string,
          timeout = 5000,
        ): Promise<Element | null> {
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

        const loraSelection = await waitForAndQuerySelector(
          "div.flex.outline-none.flex-col.items-center.gap-4.w-full.md\\:w-\\[400px\\].min-h-\\[200px\\].absolute.bottom-0.md\\:bottom-auto.md\\:top-1\\/2.md\\:left-1\\/2.md\\:-translate-x-1\\/2.md\\:-translate-y-1\\/2.px-6.py-6.rounded-t-3xl.md\\:rounded-3xl.shadow-lg.bg-white.dark\\:bg-neutral-800.max-h-screen.overflow-y-auto.overflow-x-hidden.pb-\\[var\\(--is-mobile-pb\\)\\].md\\:pb-\\[var\\(--is-mobile-pb-md\\)\\] > div > div.h-96.w-full.overflow-hidden.rounded-2xl.bg-gray-100.dark\\:bg-neutral-900 > div > div > div:nth-child(2) > div > div > div",
          5000,
        );

        if (loraSelection) {
          (loraSelection as HTMLElement).click();
          await waitForAndQuerySelector("#imagegen-input");
          return true;
        }
        return false;
      });

      if (loraFound) {
        console.log("Lora selected");
      } else {
        console.log("Lora not found, skipping selection.");
        await page.keyboard.press("Escape");
        return false;
      }
    } catch (error) {
      console.error("Error adding Lora:", error);
    }
    return true;
  }

  public async removeLora(page: Page): Promise<void> {
    await page.evaluate(() => {
      const button = document.querySelector(
        "div.-mb-2.-mt-4.flex.w-full > div > a > button",
      );
      if (button) {
        (button as HTMLElement).click();
      }
    });
  }

  public async searchLoras(
    loraName: string,
    page: Page,
  ): Promise<LoraResult[]> {
    await page.evaluate(async () => {
      const sleepBrowser = (ms: number) =>
        new Promise((r) => setTimeout(r, ms));
      const loraButton = document.querySelector(
        "button.hover-scale.flex.h-7.w-full.items-center.gap-2.rounded-lg.bg-gray-100.px-2",
      );
      (loraButton as HTMLElement)?.click();
      await sleepBrowser(500);

      async function waitForAndQuerySelector(
        selector: string,
      ): Promise<Element | null> {
        while (!document.querySelector(selector)) {
          console.log(`${selector} not loaded yet, waiting...`);
          await sleepBrowser(10);
        }
        return document.querySelector(selector);
      }
      await waitForAndQuerySelector('[id^="«r"]');
    });

    await page.type('[id^="«r"]', decodeURIComponent(loraName));
    await page.keyboard.press("Enter");

    const loraList = await page.evaluate(async () => {
      const sleepBrowser = (ms: number) =>
        new Promise((r) => setTimeout(r, ms));
      while (
        !document.querySelector(
          "div.flex.outline-none.flex-col.items-center.gap-4.w-full.md\\:w-\\[400px\\].min-h-\\[200px\\].absolute.bottom-0.md\\:bottom-auto.md\\:top-1\\/2.md\\:left-1\\/2.md\\:-translate-x-1\\/2.md\\:-translate-y-1\\/2.px-6.py-6.rounded-t-3xl.md\\:rounded-3xl.shadow-lg.bg-white.dark\\:bg-neutral-800.max-h-screen.overflow-y-auto.overflow-x-hidden.pb-\\[var\\(--is-mobile-pb\\)\\].md\\:pb-\\[var\\(--is-mobile-pb-md\\)\\] > div > div.h-96.w-full.overflow-hidden.rounded-2xl.bg-gray-100.dark\\:bg-neutral-900 > div > div > div:nth-child(2) > div > div > div",
        ) &&
        !document.querySelector(
          "div.h-96.w-full.overflow-hidden.rounded-2xl.bg-gray-100.dark\\:bg-neutral-900 > div > p",
        )
      ) {
        console.log("Lora list not loaded yet, waiting...");
        await sleepBrowser(10);
      }
      await sleepBrowser(500);

      const listElement = document.querySelector(
        'div[data-testid="virtuoso-item-list"]',
      );
      if (listElement) {
        console.log("List loaded");
        return Array.from(listElement.children).map((child) => ({
          name:
            (child.querySelector("h3") as HTMLElement)?.innerText.trim() || "",
          image: (child.querySelector("img") as HTMLImageElement)?.src || "",
          tags: Array.from(child.querySelectorAll("div > div > .rounded-md"))
            .map((tag) => (tag as HTMLElement)?.innerText.trim())
            .filter(Boolean),
        }));
      }
      return [];
    });

    await page.keyboard.press("Escape");
    return loraList;
  }

  private loadLoraCache(): void {
    try {
      const data = fs.readFileSync(this.config.LORA_CACHE_FILE, "utf8");
      const parsedCache = JSON.parse(data);
      for (const key in parsedCache) {
        this.loraSearchCache.set(key, parsedCache[key]);
      }
      console.log(`Lora cache loaded from ${this.config.LORA_CACHE_FILE}`);
    } catch (error: Error | unknown) {
      if (error && (error as NodeJS.ErrnoException).code === "ENOENT") {
        fs.writeFileSync(this.config.LORA_CACHE_FILE, "{}", "utf8");
        console.log(`Lora cache file created: ${this.config.LORA_CACHE_FILE}`);
      } else if (error instanceof Error) {
        console.warn(
          `Failed to load Lora cache from ${this.config.LORA_CACHE_FILE}: ${error.message}`,
        );
      } else {
        console.warn(
          `Failed to load Lora cache from ${this.config.LORA_CACHE_FILE}: ${error}`,
        );
      }
    }
  }

  public saveLoraCache(): void {
    const cacheToSave = Object.fromEntries(this.loraSearchCache);
    try {
      fs.writeFileSync(
        this.config.LORA_CACHE_FILE,
        JSON.stringify(cacheToSave),
        "utf8",
      );
      console.log(`Lora cache saved to ${this.config.LORA_CACHE_FILE}`);
    } catch (error: Error | unknown) {
      if (error instanceof Error) {
        console.error(
          `Failed to save Lora cache to ${this.config.LORA_CACHE_FILE}: ${error.message}`,
        );
      }
    }
  }
}

export default LoraService;
