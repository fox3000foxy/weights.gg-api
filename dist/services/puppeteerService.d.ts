import type { Page } from "rebrowser-puppeteer-core";
export declare class PuppeteerService {
    generationPage: Page | null;
    loraSearchPage: Page | null;
    private browser;
    constructor();
    initialize(): Promise<void>;
    private _optimizePage;
    private _setupPage;
    onStart(page: Page, cookie: string): Promise<void>;
    restartPage(oldPage: Page): Promise<Page>;
    getGenerationPage(): Page | null;
    getLoraSearchPage(): Page | null;
    close(): Promise<void>;
}
export default PuppeteerService;
