import { Page } from "rebrowser-puppeteer-core";
import { ILoraService } from "../services/loraService";
import { LoraResult, LoraSearchJob } from "types";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";

export interface ILoraSearchProcessor {
  processLoraSearch(job: LoraSearchJob, page: Page): Promise<void>;
  // Ajoute ici toutes les autres méthodes que tu as implémentées
}

@injectable()
export class LoraSearchProcessor implements ILoraSearchProcessor {
  constructor(
    @inject(TYPES.LoraService) private loraService: ILoraService
  ) {}

  async processLoraSearch(job: LoraSearchJob, loraSearchPage: Page) {
    const { query, res } = job;
    try {
      const searchResult = await this.performLoraSearch(query, loraSearchPage);
      res.send(searchResult);
    } catch (error) {
      console.error("Error during Lora search:", error);
      res.send([]);
    }
  }

  private async performLoraSearch(query: string, loraSearchPage: Page) {
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<unknown>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Lora search timed out"));
      }, 5000); // 5 seconds timeout
    });

    try {
      const result = await Promise.race([
        this.loraService.searchLoras(query, loraSearchPage),
        timeoutPromise,
      ]);

      if ((result as unknown[])?.length !== 0) {
        this.loraService.loraSearchCache.set(query, result as LoraResult[]);
        this.loraService.saveLoraCache();
      }

      if (timeoutId) clearTimeout(timeoutId);
      return result;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      throw error;
    }
  }
}

export default LoraSearchProcessor;
export { LoraSearchJob };