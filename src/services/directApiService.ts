import * as CryptoJS from "crypto-js";
import { connect } from "puppeteer-real-browser";
import type { Page } from "rebrowser-puppeteer-core";
import StatusService from "./statusService";
import ImageService from "./imageService";
import { injectable, inject } from "inversify";
import {
  Lora,
  SafetyCheckResult,
  CreateImageJobBody,
  ImageJobResult,
  ModelSuggestion,
  TYPES,
} from "../types";
import { Config } from "../config";

export interface IDirectApiService {
  initPuppeteer(): Promise<Page>;
  sleep(ms: number): Promise<void>;
  getUsage(): Promise<{ result: { data: { json: unknown } } }>;
  checkPromptSafety(
    prompt: string,
  ): Promise<{ result: { data: { json: SafetyCheckResult } } }>;
  createImageJob(prompt: string, loraId?: string | null): Promise<string>;
  getImageJobById(
    imageJobId: string,
  ): Promise<{ result: { data: { json: ImageJobResult } } }>;
  getModelSuggestions(
    search: string,
    limit?: number,
    type?: string,
  ): Promise<{ result: { data: { json: ModelSuggestion[] } } }>;
  generateImageJob(
    prompt: string,
    imageId: string,
    loraId?: string | null,
  ): Promise<unknown>;
  generateImage(
    prompt: string,
    imageId: string,
    loraId?: string | null,
  ): Promise<unknown>;
  searchLoras(query: string): Promise<Lora[]>;
  getQuotas(): Promise<unknown>;
  sleep(ms: number): Promise<void>;
}

export class SignatureCreator {
  private secret: string;
  // private updateStatus: Function | null = null;

  constructor(secret: string) {
    if (!secret) {
      throw Error("Secret is required for payload signing");
    }
    this.secret = secret;
    // this.updateStatus = this.StatusService
  }

  createSignature(methodName: string, payload: unknown): string {
    const jsonPayload = payload ? JSON.stringify(payload) : "";
    const data = `${methodName}${jsonPayload}`;
    return CryptoJS.HmacSHA256(data, this.secret).toString();
  }
}

export interface ApiResponse<T> {
  result: {
    data: {
      json: T;
    };
  };
}

@injectable()
export class DirectApiService implements IDirectApiService {
  private signatureCreator: SignatureCreator;
  private cookie: string;
  private headers: Record<string, string>;
  private page: Page | null = null;
  private statusService: StatusService | null = null;
  private imageService: ImageService | null = null;

  constructor(
    @inject(TYPES.Config) config: Config,
    @inject(TYPES.StatusService) statusService: StatusService,
    @inject(TYPES.ImageService) imageService: ImageService,
  ) {
    this.signatureCreator = new SignatureCreator(
      "j1UO381eyUAhn6Uo/PnuExzhyxR5qGOxe7b92OwTpOc",
    );
    this.statusService = statusService;
    this.imageService = imageService;
    this.cookie = config.WEIGHTS_GG_COOKIE;
    this.headers = {
      accept: "*/*",
      "cache-control": "no-cache",
      "content-type": "application/json",
      pragma: "no-cache",
      cookie: "next-auth.session-token=" + this.cookie,
      Referer: "https://www.weights.com/create",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    };
  }

  async initPuppeteer(): Promise<Page> {
    const { page }: { page: Page } = await connect({
      headless: true,
      args: [],
      customConfig: {},
      turnstile: true,
      connectOption: {},
      disableXvfb: false,
      ignoreAllFlags: false,
    });
    this.page = page;
    await this.page.setCacheEnabled(false); // Disable cache
    await this.page.goto("https://weights.gg/create", {waitUntil: "networkidle0"});
    await this.page.exposeFunction(
      "llmStringForSafety",
      this.checkPromptSafety.bind(this),
    );
    await this.page.exposeFunction(
      "createImageJob",
      this.createImageJob.bind(this),
    );
    await this.page.exposeFunction(
      "getImageJobById",
      this.getImageJobById.bind(this),
    );
    await this.page.exposeFunction(
      "getModelSuggestions",
      this.getModelSuggestions.bind(this),
    );
    await this.page.exposeFunction("getUsage", this.getUsage.bind(this));
    await this.page.exposeFunction("getAudioModels", this.getAudioModels.bind(this));
    await this.page.exposeFunction("createCoverStemOrTtsJob", this.createCoverStemOrTtsJob.bind(this));
    await this.page.exposeFunction("getPendingJobs", this.getPendingJobs.bind(this));
    await this.page.exposeFunction(
      "generateImageJob",
      this.generateImageJob.bind(this),
    );
    await this.page.exposeFunction("sleep", this.sleep.bind(this));
    return this.page;
  }

  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getUsage(): Promise<{ result: { data: { json: unknown } } }> {
    const url =
      "https://www.weights.com/api/data/users.getUsage?input=%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D";
    const signature = this.signatureCreator.createSignature(
      "users.getUsage",
      null,
    );

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { ...this.headers, "x-payload-sig": signature },
      });

      const data = await response.text();

      return JSON.parse(data);
    } catch (err) {
      console.error("Get quota error:", err);
      throw err;
    }
  }

  async checkPromptSafety(
    prompt: string,
  ): Promise<{ result: { data: { json: SafetyCheckResult } } }> {
    const signature = this.signatureCreator.createSignature(
      "llm.checkStringForSafety",
      prompt,
    );
    const body = JSON.stringify({ json: prompt });

    try {
      const response = await fetch(
        "https://www.weights.com/api/data/llm.checkStringForSafety",
        {
          method: "POST",
          headers: { ...this.headers, "x-payload-sig": signature },
          body,
        },
      );

      const data = await response.text();

      return JSON.parse(data);
    } catch (err) {
      console.error("Safety check error:", err);
      throw err;
    }
  }

  async createImageJob(
    prompt: string,
    loraId: string | null = null,
  ): Promise<string> {
    const body: CreateImageJobBody = {
      json: {
        prompt,
        seed: null,
        loraId: loraId,
        secondaryLoraId: null,
        tertiaryLoraId: null,
        dimensions: "SQUARE",
        inputImageUrl: null,
        templatePromptId: null,
      },
      meta: {
        values: {
          seed: ["undefined"],
          loraId: undefined,
          secondaryLoraId: ["undefined"],
          tertiaryLoraId: ["undefined"],
          inputImageUrl: ["undefined"],
          templatePromptId: ["undefined"],
        },
      },
    };

    const signatureBody: Record<string, unknown> = {};

    signatureBody.prompt = prompt;

    if (loraId) {
      signatureBody.loraId = loraId;
    } else {
      body.meta.values.loraId = ["undefined"];
    }

    signatureBody.dimensions = body.json.dimensions;

    const signature = this.signatureCreator.createSignature(
      "creations.createImageJob",
      signatureBody,
    );

    try {
      const response = await fetch(
        "https://www.weights.com/api/data/creations.createImageJob",
        {
          method: "POST",
          headers: { ...this.headers, "x-payload-sig": signature },
          body: JSON.stringify(body),
        },
      );

      const data = await response.text();

      const result = JSON.parse(data);
      return result.result.data.json;
    } catch (err) {
      console.error("Create image job error:", err);
      throw err;
    }
  }

  async getImageJobById(
    imageJobId: string,
  ): Promise<{ result: { data: { json: ImageJobResult } } }> {
    const signature = this.signatureCreator.createSignature(
      "creations.getImageJobById",
      imageJobId,
    );
    const params = new URLSearchParams({
      input: JSON.stringify({ json: imageJobId }),
    });
    const url = `https://www.weights.com/api/data/creations.getImageJobById?${params.toString()}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { ...this.headers, "x-payload-sig": signature },
      });

      const data = await response.text();

      return JSON.parse(data);
    } catch (err) {
      console.error("Get image job error:", err);
      throw err;
    }
  }

  async getModelSuggestions(
    search: string,
    limit: number = 25,
    type: string = "all",
  ): Promise<{ result: { data: { json: ModelSuggestion[] } } }> {
    const body = {
      search,
      limit,
      type,
      direction: "forward",
    };

    const signature = this.signatureCreator.createSignature(
      "imageTraining.getModelSuggestions",
      body,
    );
    const params = new URLSearchParams({
      input: JSON.stringify({ json: body }),
    });
    const url = `https://www.weights.com/api/data/imageTraining.getModelSuggestions?${params.toString()}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { ...this.headers, "x-payload-sig": signature },
      });

      const data = await response.text();

      return JSON.parse(data);
    } catch (err) {
      console.error("Get model suggestions error:", err);
      throw err;
    }
  }

  async getAudioModels(
    search: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<ApiResponse<any[]>> {
    const body = {
      json: search
    };

    const signature = this.signatureCreator.createSignature(
      "models.searchAudioModels",
      search,
    );
    // console.log(signature);
    const url = `https://www.weights.com/api/data/models.searchAudioModels`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { ...this.headers, "x-payload-sig": signature },
        body: JSON.stringify(body),
      });

      const data = await response.text();

      return JSON.parse(data);
    } catch (err) {
      console.error("Get model suggestions error:", err);
      throw err;
    }
  }

  async createCoverStemOrTtsJob(
    prompt: string,
    audioModelId: string,
  ): Promise<string> {
    const body = {
      "json": {
          "rvcModelId": audioModelId,
          "duetRvcModelId": null,
          "inputUrl": null,
          "ttsText": prompt,
          "ttsBaseModel": "m-us-1",
          "origin": "WEB",
          "inputType": "TTS",
          "inputFileName": null,
          "pitch": 0,
          "instrumentalPitch": null,
          "deEcho": null,
          "isolateMainVocals": null,
          "consonantProtection": null,
          "volumeEnvelope": null,
          "preStemmed": true,
          "modelRegions": null
      },
      "meta": {
          "values": {
              "duetRvcModelId": [
                  "undefined"
              ],
              "inputUrl": [
                  "undefined"
              ],
              "inputFileName": [
                  "undefined"
              ],
              "instrumentalPitch": [
                  "undefined"
              ],
              "deEcho": [
                  "undefined"
              ],
              "isolateMainVocals": [
                  "undefined"
              ],
              "consonantProtection": [
                  "undefined"
              ],
              "volumeEnvelope": [
                  "undefined"
              ],
              "modelRegions": [
                  "undefined"
              ]
          }
      }
  }

    const signatureBody = {"rvcModelId": audioModelId,"ttsText":prompt,"ttsBaseModel":"m-us-1","origin":"WEB","inputType":"TTS","pitch":0,"preStemmed":true};

    const signature = this.signatureCreator.createSignature(
      "creations.createCoverStemOrTtsJob",
      signatureBody,
    );

    try {
      const response = await fetch(
        "https://www.weights.com/api/data/creations.createCoverStemOrTtsJob",
        {
          method: "POST",
          headers: { ...this.headers, "x-payload-sig": signature },
          body: JSON.stringify(body),
        },
      );

      const data = await response.text();

      return JSON.parse(data).result.data.json.id;
    } catch (err) {
      console.error("Create cover stem or TTS job error:", err);
      throw err;
    }
  }

  async getPendingJobs(
    coverJobIds: string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const signature = this.signatureCreator.createSignature(
      "creations.getPendingJobs",
      { coverJobIds, videoJobIds: [], trainingJobIds: [] },
    );

    try {
      const params = new URLSearchParams({
        input: JSON.stringify({
          json: { coverJobIds, videoJobIds: [], trainingJobIds: [] },
        }),
      });
      const url = `https://www.weights.com/api/data/creations.getPendingJobs?${params.toString()}`;
      // console.log(url);
      // console.log(signature);
      const response = await fetch(url, {
        method: "GET",
        headers: { ...this.headers, "x-payload-sig": signature },
      });


      const data = await response.text();

      return JSON.parse(data);
    } catch (err) {
      console.error("Get pending jobs error:", err);
      throw err;
    }
  }

  async generateImageJob(
    prompt: string,
    imageId: string,
    loraId: string | null = null,
  ): Promise<unknown> {
    const llmStringForSafetyRequest = await this.checkPromptSafety(prompt);
    const llmStringForSafetyResult = llmStringForSafetyRequest.result.data.json;
    if (
      !llmStringForSafetyResult.stringIsUnsafe &&
      !llmStringForSafetyResult.hasCSAM &&
      !llmStringForSafetyResult.hasSelfHarm
    ) {
      const createImageJobRequest = await this.createImageJob(prompt, loraId);
      const imageJobId = createImageJobRequest;
      let getImageJobByIdRequest = await this.getImageJobById(imageJobId);
      let getImageJobByIdResult: {
        status: string;
        imageB64?: string;
        outputUrl: string;
      } = getImageJobByIdRequest.result.data.json;

      let oldStatus = null;
      let oldB64 = null;

      while (getImageJobByIdResult.status !== "SUCCEEDED") {
        await this.sleep(100);

        if (getImageJobByIdResult.status !== oldStatus) {
          this.statusService?.updateImageStatus(imageId, "STARTING");
          oldStatus = getImageJobByIdResult.status;
        }

        if (
          getImageJobByIdResult.imageB64 &&
          getImageJobByIdResult.imageB64 !== oldB64
        ) {
          await this.imageService?.saveBase64Image(
            getImageJobByIdResult.imageB64,
            imageId,
            false,
          );
          this.statusService?.updateImageStatus(imageId, "PENDING");
          oldB64 = getImageJobByIdResult.imageB64;
        }

        getImageJobByIdRequest = await this.getImageJobById(imageJobId);
        getImageJobByIdResult = getImageJobByIdRequest.result.data.json;
      }

      await this.imageService?.downloadImage(
        getImageJobByIdResult.outputUrl,
        imageId,
      );
      this.statusService?.updateImageStatus(imageId, "COMPLETED");
      return getImageJobByIdResult.outputUrl;
    } else {
      console.error(
        "llmStringForSafety error: ",
        "String is unsafe, please check your input.",
      );
      this.statusService?.updateImageStatus(
        imageId,
        "FAILED",
        "String is unsafe, please check your input.",
      );
      return { error: "String is unsafe, please check your input." };
    }
  }

  async generateImage(
    prompt: string,
    imageId: string,
    loraId: string | null = null,
  ): Promise<unknown> {
    if (!this.page) {
      throw new Error(
        "Puppeteer page is not initialized. Call initPuppeteer() first.",
      );
    }
    const result = await this.page.evaluate(
      async (prompt, imageId, loraId) => {
        const job = await this.generateImageJob(prompt, imageId, loraId);
        return job;
      },
      prompt,
      imageId,
      loraId,
    );
    return result;
  }

  async searchLoras(query: string): Promise<Lora[]> {
    if (!this.page) {
      throw new Error(
        "Puppeteer page is not initialized. Call initPuppeteer() first.",
      );
    }
    if (!query) {
      throw new Error("Query is required for Lora search.");
    }

    const result = await this.page.evaluate(async (query) => {
      const loraSearchRequest = await this.getModelSuggestions(query);
      const loraSearchResult = loraSearchRequest.result.data.json;
      return loraSearchResult.map((item: ModelSuggestion) => {
        return {
          id: item.id,
          name: item.name,
          description: item.description,
          image: item.ImageLoraTrainingJob[0]?.UploadedTrainingImage[0]?.url,
          tags: [
            item.isNSFW ? "NSFW" : undefined,
            item.isPublic ? "Public" : "Private",
          ].filter(Boolean) as string[],
          triggers: item.triggers,
        };
      });
    }, query);
    return result;
  }

  async searchAudioModels(query: string): Promise<unknown[]> {
    if (!this.page) {
      throw new Error(
        "Puppeteer page is not initialized. Call initPuppeteer() first.",
      );
    }
    if (!query) {
      throw new Error("Query is required for Lora search.");
    }

    const result = await this.page.evaluate(async (query) => {
      const loraSearchRequest = await this.getAudioModels(query);
      const loraSearchResult = loraSearchRequest.result.data.json;
      return loraSearchResult.map((item) => {
        return {
          id: item.id,
          title: item.title,
          content: item.content,
          image: item.image,
        };
      });
    }, query);
    return result;
  }

  async createAudioJob(
    prompt: string,
    audioModelId: string,
  ): Promise<string> {
    if (!this.page) {
      throw new Error(
        "Puppeteer page is not initialized. Call initPuppeteer() first.",
      );
    }
    if (!prompt) {
      throw new Error("Prompt is required for Lora search.");
    }
    if (!audioModelId) {
      throw new Error("Audio model ID is required for Lora search.");
    }

    const result = await this.page.evaluate(async (prompt, audioModelId) => {
      const loraSearchResult = await this.createCoverStemOrTtsJob(prompt, audioModelId);

      // console.log(loraSearchResult);

      let getImageJobByIdRequest = await this.getPendingJobs([loraSearchResult]);
      let getImageJobByIdResult = getImageJobByIdRequest.result.data.json;
      let result = getImageJobByIdResult.coverJobs[0];
      while (result.status !== "SUCCEEDED") {
        console.log(result.status);
        await this.sleep(1000);
        getImageJobByIdRequest = await this.getPendingJobs([loraSearchResult]);
        getImageJobByIdResult = getImageJobByIdRequest.result.data.json;
        result = getImageJobByIdResult.coverJobs[0];
      }

      return "https://tracks.weights.com/" + loraSearchResult + "/output_track.mp3";
    }, prompt, audioModelId);
    return result;
  }

  async getQuotas(): Promise<unknown> {
    if (!this.page) {
      throw new Error(
        "Puppeteer page is not initialized. Call initPuppeteer() first.",
      );
    }
    return await this.page.evaluate(async () => {
      const getUsageRequest = await this.getUsage();
      const getUsageResult = getUsageRequest.result.data.json;
      return getUsageResult;
    });
  }
}

export default DirectApiService;
