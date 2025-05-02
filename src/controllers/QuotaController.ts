import { inject } from "inversify";
import { controller, httpGet } from "inversify-express-utils";
import { IPuppeteerService } from "../services/puppeteerService";
import { TYPES } from "../types";
import { Request, Response } from "express";
import { checkApiKey } from "../middlewares/checkApiKey";

@controller("/quota")
export class QuotaController {
    constructor(
        @inject(TYPES.PuppeteerService) private puppeteerService: IPuppeteerService,
    ) {}

    @httpGet("/", checkApiKey)
    public async getQuota(_req: Request, res: Response) {
        const generationPage = await this.puppeteerService.getGenerationPageReady();

        const quota = await generationPage.evaluate(async () => {
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

            const element = await waitForAndQuerySelector(
                "body > div.MuiModal-root.css-1sucic7 > div.flex.outline-none.flex-col.items-center.gap-4.w-full.md\\:w-\\[400px\\].min-h-\\[200px\\].absolute.bottom-0.md\\:bottom-auto.md\\:top-1\\/2.md\\:left-1\\/2.md\\:-translate-x-1\\/2.md\\:-translate-y-1\\/2.px-6.py-6.rounded-t-3xl.md\\:rounded-3xl.shadow-lg.bg-white.dark\\:bg-neutral-800.max-h-screen.overflow-y-auto.overflow-x-hidden.pb-\\[var\\(--is-mobile-pb\\)\\].md\\:pb-\\[var\\(--is-mobile-pb-md\\)\\] > div.-mt-2.flex.w-full.items-center.justify-center.gap-2 > a > div.flex.items-center.gap-2 > span",
            );
            return element?.textContent || null;
        });
        res.send(quota);
    }
}