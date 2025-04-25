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
  AudioModel,
} from "../types";
import { Config } from "../config";
import { randomUUID } from "crypto";
import fs from 'fs';
import https from 'https';

export interface ApiResponse<T> {
  result: {
    data: {
      json: T;
    };
  };
}

export interface IDirectApiService {
  initPuppeteer(): Promise<Page>;
  sleep(ms: number): Promise<void>;
  getUsage(): Promise<ApiResponse<unknown>>;
  checkPromptSafety(prompt: string): Promise<ApiResponse<SafetyCheckResult>>;
  createImageJob(prompt: string, loraId?: string | null): Promise<string>;
  getImageJobById(imageJobId: string): Promise<ApiResponse<ImageJobResult>>;
  getModelSuggestions(
    search: string,
    limit?: number,
    type?: string,
  ): Promise<ApiResponse<ModelSuggestion[]>>;
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
  
  constructor(
    @inject(TYPES.Config) config: Config,
    @inject(TYPES.StatusService) private readonly statusService: StatusService,
    @inject(TYPES.ImageService) private readonly imageService: ImageService,
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
    await this.page.exposeFunction("randomUUID", this.randomUUID.bind(this));
    await this.page.exposeFunction("readFile", this.readFile.bind(this));
    await this.page.exposeFunction("log", this.log.bind(this));
    await this.page.exposeFunction("getAudioUploadUrl", this.getAudioUploadUrl.bind(this));
    return this.page;
  }

  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  log(...args: unknown[]): void {
    console.log(...args);
  }

  async getUsage(): Promise<ApiResponse<unknown>> {
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
  ): Promise<ApiResponse<SafetyCheckResult>> {
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
  ): Promise<ApiResponse<ImageJobResult>> {
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
  ): Promise<ApiResponse<ModelSuggestion[]>> {
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

  async uploadAudioFile(
    fileData: Buffer,
  )
  : Promise<string> {
    if (!this.page) {
      throw new Error(
        "Puppeteer page is not initialized. Call initPuppeteer() first.",
      );
    }
    this.log(`File loaded: ${fileData.length} bytes`);
    const uuid = randomUUID();
    const {signedUrl, hostedUrl} = await this.page.evaluate(async (uuid) => {
      const fileExtension = ".mp3";
      const uploadUrlRequest = await this.getAudioUploadUrl(uuid + fileExtension);
      const {signedUrl, hostedUrl} = uploadUrlRequest.result.data.json;
      return { signedUrl, hostedUrl };
    }, uuid);
      
    try {
      // Upload file to signed URL
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        body: fileData, // Use buffer directly, don't convert to string
        headers: {
          // "Content-Type": "audio/mpeg", // Standard MIME type for MP3
          "Content-Length": fileData.length.toString(),
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status: ${uploadResponse.status}`);
      }

      return hostedUrl;
    } catch (error) {
      console.error("Error uploading audio file:", error);
      throw error;
    }
  }

  async createCoverStemOrTtsJob(
    audioModelId: string,
    prompt?: string,
    inputUrl?: string,
  ): Promise<string> {
    const body = {
      "json": {
          "rvcModelId": audioModelId,
          "duetRvcModelId": undefined,
          "inputUrl": inputUrl ? inputUrl : undefined,
          "ttsText": !inputUrl ? prompt: "",
          "ttsBaseModel": "m-us-1",
          "origin": "WEB",
          "inputType": inputUrl? "RECORDING" : "TTS",
          "inputFileName": inputUrl ? "Custom Recording" : undefined,
          "pitch": 0,
          "instrumentalPitch": undefined,
          "deEcho": undefined,
          "isolateMainVocals": undefined,
          "consonantProtection": undefined,
          "volumeEnvelope": undefined,
          "preStemmed": true,
          "modelRegions": undefined
      },
      "meta": {
          "values": {

          }
      }
  }

  for (const key in body.json) {
    const keyValue = Object.prototype.hasOwnProperty.call(body.json, key);
    if (keyValue === null || keyValue === undefined) {
      if (!body.meta.values) {
        body.meta.values = {};
      }
      (body.meta.values as { [key: string]: string[] })[key] = ["undefined"];
    }
  }

    const signatureBody = JSON.parse(JSON.stringify(body.json));
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

  async getAudioUploadUrl(fileName: string): Promise<ApiResponse<{signedUrl: string; hostedUrl: string}>> {
    const signature = this.signatureCreator.createSignature(
      "webapp.getAudioUploadUrl",
      fileName,
    );
    try {
      const response = await fetch(
        "https://www.weights.com/api/data/webapp.getAudioUploadUrl",
        {
          method: "POST",
          headers: { ...this.headers, "x-payload-sig": signature },
          body: JSON.stringify({ json: fileName }),
        },
      );

      const data = await response.text();

      return JSON.parse(data);
    } catch (err) {
      console.error("Get audio upload URL error:", err);
      throw err;
    }
  }

  // ===== PUPPETEER =====
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

  async searchAudioModels(query: string): Promise<AudioModel[]> {
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

  randomUUID(): string {
    return randomUUID();
  }

  async readFile(path: string): Promise<Buffer> {
    return fs.promises.readFile(path);
  }

  async uploadLargeFile(filePath: string, signedUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(filePath);
      
      const options = new URL(signedUrl);
      const req = https.request({
        hostname: options.hostname,
        path: options.pathname + options.search,
        method: 'PUT',
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': fs.statSync(filePath).size.toString()
        }
      }, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`Upload failed: ${res.statusCode}`));
        }
      });
      
      fileStream.pipe(req);
      
      req.on('error', (err) => reject(err));
    });
  }

  async createAudioJob(
    audioModelId: string,
    prompt?: string,
    inputUrl?: string,
  ): Promise<string> {
    if (!this.page) {
      throw new Error(
        "Puppeteer page is not initialized. Call initPuppeteer() first.",
      );
    }
    if (!prompt && !audioModelId) {
      throw new Error("Prompt or audioModelId is required for Lora search.");
    }
    const result = await this.page.evaluate(async (prompt, audioModelId, inputUrl) => {
      const loraSearchResult = await this.createCoverStemOrTtsJob(audioModelId, prompt, inputUrl);
      this.log("Lora search result: ", loraSearchResult);
      let getImageJobByIdRequest = await this.getPendingJobs([loraSearchResult]);
      let getImageJobByIdResult = getImageJobByIdRequest.result.data.json;
      let result = getImageJobByIdResult.coverJobs[0];
      while (result.status !== "SUCCEEDED") {
        await this.sleep(100);
        getImageJobByIdRequest = await this.getPendingJobs([loraSearchResult]);
        getImageJobByIdResult = getImageJobByIdRequest.result.data.json;
        result = getImageJobByIdResult.coverJobs[0];
      }

      return "https://tracks.weights.com/" + loraSearchResult + "/output_track.mp3";
    }, prompt, audioModelId, inputUrl);
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
