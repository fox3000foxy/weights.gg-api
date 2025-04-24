import * as fs from "fs";
import { Config } from "../config";
import { LoraResult } from "types";
import DirectApiService from "./directApiService";

export class LoraService {
  public config: Config;
  public loraSearchCache: Map<string, LoraResult[]>;
  public directApiService: DirectApiService;

  constructor(config: Config, directApiService: DirectApiService) {
    this.config = config;
    this.loraSearchCache = new Map();
    this.loadLoraCache();
    this.directApiService = directApiService;
  }

  public async searchLoras(
    loraName: string
  ): Promise<LoraResult[]> {
    if (this.loraSearchCache.has(loraName)) {
      console.log(`Lora cache hit for ${loraName}`);
      return this.loraSearchCache.get(loraName) || [];
    }

    const loras = await this.directApiService.searchLoras(loraName);
    if(loras.length !== 0) {
      this.loraSearchCache.set(loraName, loras);
      this.saveLoraCache();
    }
    return loras;
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
