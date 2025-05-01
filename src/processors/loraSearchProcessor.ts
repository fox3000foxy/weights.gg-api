import { Page } from "rebrowser-puppeteer-core";
import { ILoraService } from "../services/loraService";
import { LoraResult, LoraSearchJob } from "types";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";

export interface ILoraSearchProcessor {
  processLoraSearch(job: LoraSearchJob, page: Page): Promise<void>;
}

@injectable()
export class LoraSearchProcessor implements ILoraSearchProcessor {
  private readonly searchTimeoutMs = 5000;

  constructor(
    @inject(TYPES.LoraService) private loraService: ILoraService
  ) {}

  async processLoraSearch(job: LoraSearchJob, loraSearchPage: Page): Promise<void> {
    const { query, res } = job;
    try {
      const searchResult = await this.performLoraSearch(query, loraSearchPage);
      res.send(searchResult);
    } catch (error) {
      console.error("Error during Lora search:", error);
      res.send([]);
    }
  }

  private async performLoraSearch(query: string, loraSearchPage: Page): Promise<LoraResult[]> {
    try {
      const result = await Promise.race([
        this.loraService.searchLoras(query, loraSearchPage),
        this.createTimeoutPromise(this.searchTimeoutMs),
      ]);

      const loraResults = result as LoraResult[];
      if (loraResults?.length !== 0) {
        this.cacheLoraResults(query, loraResults);
      }

      return loraResults;
    } catch (error) {
      console.error(`Lora search failed for query "${query}":`, error);
      throw error;
    }
  }

  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Lora search timed out"));
      }, timeoutMs);
    });
  }

  private cacheLoraResults(query: string, results: LoraResult[]): void {
    this.loraService.loraSearchCache.set(query, results);
    this.loraService.saveLoraCache();
  }
}

export default LoraSearchProcessor;
export { LoraSearchJob };