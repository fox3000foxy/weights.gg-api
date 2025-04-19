import type { Page } from "rebrowser-puppeteer-core";
export declare class PuppeteerService {
    generationPage: Page | null;
    loraSearchPage: Page | null;
    constructor();
    initialize(): Promise<void>;
    onStart(page: Page, cookie: string): Promise<void>;
    restartPage(page: Page): Promise<Page>;
    getGenerationPage(): Page | null;
    getLoraSearchPage(): Page | null;
}
export default PuppeteerService;
