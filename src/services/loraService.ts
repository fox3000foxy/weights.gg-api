import * as fs from "fs";
import { Config } from "../config";
import { AudioModel, LoraResult, TYPES } from "../types";
import DirectApiService from "./directApiService";
import { inject, injectable } from "inversify";

export interface ILoraService {
  loraSearchCache: Map<string, LoraResult[]>;
  audioSearchCache: Map<string, AudioModel[]>;
  searchLoras(loraName: string): Promise<LoraResult[]>;
  searchVoiceModels(voiceModelName: string): Promise<AudioModel[]>;
  saveLoraCache(): void;
  saveAudioCache(): void;
}

@injectable()
export class LoraService implements ILoraService {
  public loraSearchCache: Map<string, LoraResult[]>;
  public audioSearchCache: Map<string, AudioModel[]>;
  public directApiService: DirectApiService;

  constructor(@inject(TYPES.Config) private config: Config, @inject(TYPES.DirectApiService) directApiService: DirectApiService) {
    this.config = config;
    this.loraSearchCache = new Map();
    this.audioSearchCache = new Map();
    this.loadLoraCache();
    this.loadAudioCache();
    this.directApiService = directApiService;
  }

  public async searchLoras(loraName: string): Promise<LoraResult[]> {
    if (this.loraSearchCache.has(loraName)) {
      console.log(`Lora cache hit for ${loraName}`);
      return this.loraSearchCache.get(loraName) || [];
    }

    const loras = await this.directApiService.searchLoras(loraName);
    if (loras.length !== 0) {
      this.loraSearchCache.set(loraName, loras);
      this.saveLoraCache();
    }
    return loras;
  }

  public async searchVoiceModels(voiceModelName: string): Promise<AudioModel[]> {
    if (this.audioSearchCache.has(voiceModelName)) {
      console.log(`Audio cache hit for ${voiceModelName}`);
      return this.audioSearchCache.get(voiceModelName) || [];
    }

    const voiceModels = await this.directApiService.searchAudioModels(voiceModelName);
    if (voiceModels.length !== 0) {
      this.audioSearchCache.set(voiceModelName, voiceModels);
      this.saveAudioCache();
    }
    return voiceModels;
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

  private loadAudioCache(): void {
    try {
      const data = fs.readFileSync(this.config.AUDIO_CACHE_FILE, "utf8");
      const parsedCache = JSON.parse(data);
      for (const key in parsedCache) {
        this.audioSearchCache.set(key, parsedCache[key]);
      }
      console.log(`Audio cache loaded from ${this.config.AUDIO_CACHE_FILE}`);
    } catch (error: Error | unknown) {
      if (error && (error as NodeJS.ErrnoException).code === "ENOENT") {
        fs.writeFileSync(this.config.AUDIO_CACHE_FILE, "{}", "utf8");
        console.log(`Audio cache file created: ${this.config.AUDIO_CACHE_FILE}`);
      } else if (error instanceof Error) {
        console.warn(
          `Failed to load audio cache from ${this.config.AUDIO_CACHE_FILE}: ${error.message}`,
        );
      } else {
        console.warn(
          `Failed to load audio cache from ${this.config.AUDIO_CACHE_FILE}: ${error}`,
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

  public saveAudioCache(): void {
    const cacheToSave = Object.fromEntries(this.audioSearchCache);
    try {
      fs.writeFileSync(
        this.config.AUDIO_CACHE_FILE,
        JSON.stringify(cacheToSave),
        "utf8",
      );
      console.log(`Audio cache saved to ${this.config.AUDIO_CACHE_FILE}`);
    } catch (error: Error | unknown) {
      if (error instanceof Error) {
        console.error(
          `Failed to save audio cache to ${this.config.AUDIO_CACHE_FILE}: ${error.message}`,
        );
      }
    }
  }
}

export default LoraService;
