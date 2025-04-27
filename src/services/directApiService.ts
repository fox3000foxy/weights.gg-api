/* eslint-disable @typescript-eslint/no-non-null-assertion */
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
  CreateAudioJobBody,
} from "../types";
import { Config } from "../config";
import { randomUUID } from "crypto";
import fs from 'fs';
import https from 'https';

/**
 * Interface for API responses
 */
export interface ApiResponse<T> {
  result: {
    data: {
      json: T;
    };
  };
}

/**
 * Interface for DirectApiService
 */
export interface IDirectApiService {
  initPuppeteer(): Promise<Page>;
  sleep(ms: number): Promise<void>;
  getUsage(): Promise<ApiResponse<unknown>>;
  checkPromptSafety(prompt: string): Promise<ApiResponse<SafetyCheckResult>>;
  createImageJob(prompt: string, loraId?: string | null): Promise<string>;
  getImageJobById(imageJobId: string): Promise<ApiResponse<ImageJobResult>>;
  getModelSuggestions(search: string, limit?: number, type?: string): Promise<ApiResponse<ModelSuggestion[]>>;
  generateImageJob(prompt: string, imageId: string, loraId?: string | null): Promise<unknown>;
  generateImage(prompt: string, imageId: string, loraId?: string | null): Promise<unknown>;
  searchLoras(query: string): Promise<Lora[]>;
  getQuotas(): Promise<unknown>;
  getAudioModels(search: string): Promise<ApiResponse<unknown[]>>;
  uploadAudioFile(fileData: Buffer): Promise<string>;
  createCoverStemOrTtsJob(
    audioModelId: string,
    prompt?: string,
    inputUrl?: string,
    pitch?: number,
    male?: boolean,
  ): Promise<string>;
  getAudioUploadUrl(fileName: string): Promise<ApiResponse<{ signedUrl: string; hostedUrl: string }>>;
  uploadLargeFile(filePath: string, signedUrl: string): Promise<void>;
  createAudioJob(
    audioModelId: string,
    prompt?: string,
    inputUrl?: string,
    pitch?: string,
    male?: string,
  ): Promise<string>;
  searchAudioModels(query: string): Promise<AudioModel[]>;
  log(...args: unknown[]): void;
}

/**
 * Helper class for creating signatures for API requests
 */
export class SignatureCreator {
  constructor(private readonly secret: string) {
    if (!secret) {
      throw Error("Secret is required for payload signing");
    }
  }

  /**
   * Creates a signature for API requests
   */
  createSignature(methodName: string, payload: unknown): string {
    const jsonPayload = payload ? JSON.stringify(payload) : "";
    const data = `${methodName}${jsonPayload}`;
    return CryptoJS.HmacSHA256(data, this.secret).toString();
  }
}

/**
 * Service for interacting with the Weights.gg API
 */
@injectable()
export class DirectApiService implements IDirectApiService {
  private signatureCreator: SignatureCreator;
  private cookie: string;
  private headers: Record<string, string>;
  private page: Page | null = null;
  private readonly API_BASE_URL = "https://www.weights.com/api/data";
  private readonly AUTH_SECRET = "j1UO381eyUAhn6Uo/PnuExzhyxR5qGOxe7b92OwTpOc";
  
  constructor(
    @inject(TYPES.Config) config: Config,
    @inject(TYPES.StatusService) private readonly statusService: StatusService,
    @inject(TYPES.ImageService) private readonly imageService: ImageService,
  ) {
    this.signatureCreator = new SignatureCreator(this.AUTH_SECRET);
    this.statusService = statusService;
    this.imageService = imageService;
    this.cookie = config.WEIGHTS_GG_COOKIE;
    this.headers = this.createDefaultHeaders();
  }

  /**
   * Creates default headers for API requests
   */
  private createDefaultHeaders(): Record<string, string> {
    return {
      accept: "*/*",
      "cache-control": "no-cache",
      "content-type": "application/json",
      pragma: "no-cache",
      cookie: "next-auth.session-token=" + this.cookie,
      Referer: "https://www.weights.com/create",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    };
  }

  /**
   * Initialize Puppeteer browser
   */
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
    await this.page.setCacheEnabled(false);
    await this.page.goto("https://weights.gg/create", { waitUntil: "networkidle0" });
    
    await this.exposeFunctionsToPage();
    return this.page;
  }

  /**
   * Expose service methods to Puppeteer page
   */
  private async exposeFunctionsToPage(): Promise<void> {
    if (!this.page) return;

    const methodsToExpose: (keyof DirectApiService)[] = [
      "checkPromptSafety",
      "createImageJob",
      "getImageJobById",
      "getModelSuggestions",
      "getUsage",
      "getAudioModels",
      "createCoverStemOrTtsJob",
      "generateImageJob",
      "sleep",
      "randomUUID",
      "readFile",
      "log",
      "getAudioUploadUrl",
    ];

    for (const method of methodsToExpose) {
      await this.page.exposeFunction(method, this[method].bind(this));
    }
  }

  /**
   * Utility method to pause execution
   */
  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Utility method for logging
   */
  log(...args: unknown[]): void {
    console.log(...args);
  }

  /**
   * Utility method to generate a UUID
   */
  randomUUID(): string {
    return randomUUID();
  }

  /**
   * Read a file from the filesystem
   */
  async readFile(path: string): Promise<Buffer> {
    return fs.promises.readFile(path);
  }

  /**
   * Makes an API request with proper signature
   */
  private async makeApiRequest<T>(
    endpoint: string, 
    method: string, 
    apiMethod: string, 
    payload?: unknown, 
    isQueryParams = false
  ): Promise<ApiResponse<T>> {
    try {
      const signature = this.signatureCreator.createSignature(apiMethod, payload);
      const headers = { ...this.headers, "x-payload-sig": signature };
      const url = `${this.API_BASE_URL}/${endpoint}`;
      
      const fetchOptions: RequestInit = { 
        method, 
        headers 
      };
      
      let fullUrl = url;
      
      if (method === "GET" && payload && isQueryParams) {
        const params = new URLSearchParams({
          input: JSON.stringify({ json: payload }),
        });
        fullUrl = `${url}?${params.toString()}`;
      } else if (payload) {
        fetchOptions.body = JSON.stringify(isQueryParams ? { json: payload } : payload);
      }
      
      const response = await fetch(fullUrl, fetchOptions);
      const data = await response.text();
      
      return JSON.parse(data);
    } catch (error) {
      console.error(`API request error (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Get user usage information
   */
  async getUsage(): Promise<ApiResponse<unknown>> {
    return this.makeApiRequest(
      "users.getUsage", 
      "GET", 
      "users.getUsage", 
      null, 
      true
    );
  }

  /**
   * Check if a prompt is safe to use
   */
  async checkPromptSafety(prompt: string): Promise<ApiResponse<SafetyCheckResult>> {
    return this.makeApiRequest(
      "llm.checkStringForSafety", 
      "POST", 
      "llm.checkStringForSafety", 
      { json: prompt }
    );
  }

  /**
   * Create a new image generation job
   */
  async createImageJob(prompt: string, loraId: string | null = null): Promise<string> {
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
          secondaryLoraId: ["undefined"],
          tertiaryLoraId: ["undefined"],
          inputImageUrl: ["undefined"],
          templatePromptId: ["undefined"],
        },
      },
    };

    if (!loraId) {
      body.meta.values.loraId = ["undefined"];
    }

    const signatureBody = JSON.parse(JSON.stringify(body.json));

    const response = await this.makeApiRequest(
      "creations.createImageJob", 
      "POST", 
      "creations.createImageJob", 
      signatureBody
    );

    return response.result.data.json as string;
  }

  /**
   * Get information about an image job
   */
  async getImageJobById(imageJobId: string): Promise<ApiResponse<ImageJobResult>> {
    return this.makeApiRequest(
      "creations.getImageJobById", 
      "GET", 
      "creations.getImageJobById", 
      imageJobId, 
      true
    );
  }

  /**
   * Get model suggestions based on search query
   */
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

    return this.makeApiRequest(
      "imageTraining.getModelSuggestions", 
      "GET", 
      "imageTraining.getModelSuggestions", 
      body, 
      true
    );
  }

  /**
   * Search for audio models
   */
  async getAudioModels(search: string): Promise<ApiResponse<AudioModel[]>> {
    return this.makeApiRequest(
      "models.searchAudioModels", 
      "POST", 
      "models.searchAudioModels", 
      search, 
      true
    );
  }

  /**
   * Get a signed URL for audio upload
   */
  async getAudioUploadUrl(fileName: string): Promise<ApiResponse<{signedUrl: string; hostedUrl: string}>> {
    return this.makeApiRequest(
      "webapp.getAudioUploadUrl", 
      "POST", 
      "webapp.getAudioUploadUrl", 
      fileName, 
      true
    );
  }

  /**
   * Upload an audio file
   */
  async uploadAudioFile(fileData: Buffer): Promise<string> {
    this.ensurePageInitialized();
    
    this.log(`File loaded: ${fileData.length} bytes`);
    const uuid = this.randomUUID();
    
    const { signedUrl, hostedUrl } = await this.page!.evaluate(async (uuid) => {
      const fileExtension = ".mp3";
      const uploadUrlRequest = await this.getAudioUploadUrl(uuid + fileExtension);
      return uploadUrlRequest.result.data.json;
    }, uuid);
      
    try {
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        body: fileData,
        headers: {
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

  /**
   * Upload a large file to a signed URL
   */
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

  /**
   * Create a cover, stem or TTS job
   */
  async createCoverStemOrTtsJob(
    audioModelId: string,
    prompt?: string,
    inputUrl?: string,
    pitch: number = 0,
    male: boolean = true,
  ): Promise<string> {
    const body = {
      json: this.createCoverStemJobPayload(audioModelId, prompt, inputUrl, pitch, male),
      meta: { values: {} }
    } as CreateAudioJobBody;

    // Add undefined values to meta
    this.addUndefinedValuesToMeta(body);

    const signatureBody = JSON.parse(JSON.stringify(body.json));
    
    const response = await this.makeApiRequest(
      "creations.createCoverStemOrTtsJob", 
      "POST", 
      "creations.createCoverStemOrTtsJob", 
      signatureBody
    );

    const responseBody = response.result.data.json as { id: string };

    return responseBody.id;
  }

  /**
   * Helper to create payload for cover stem job
   */
  private createCoverStemJobPayload(
    audioModelId: string,
    prompt?: string,
    inputUrl?: string,
    pitch: number = 0,
    male: boolean = true,
  ) {
    return {
      rvcModelId: audioModelId,
      duetRvcModelId: undefined,
      inputUrl: inputUrl ? inputUrl : undefined,
      ttsText: !inputUrl ? prompt : "",
      ttsBaseModel: male ? "m-us-1" : "f-us-1",
      origin: "WEB",
      inputType: inputUrl ? "RECORDING" : "TTS",
      inputFileName: inputUrl ? "Custom Recording" : undefined,
      pitch: pitch,
      instrumentalPitch: undefined,
      deEcho: undefined,
      isolateMainVocals: undefined,
      consonantProtection: undefined,
      volumeEnvelope: undefined,
      preStemmed: true,
      modelRegions: undefined
    };
  }

  /**
   * Add undefined values to meta field
   */
  private addUndefinedValuesToMeta(body: CreateImageJobBody | CreateAudioJobBody): void {
    for (const key in body.json) {
      const keyValue = Object.prototype.hasOwnProperty.call(body.json, key);
      if (keyValue === null || keyValue === undefined) {
        if (!body.meta.values) {
          body.meta.values = {};
        }
        (body.meta.values as { [key: string]: string[] })[key] = ["undefined"];
      }
    }
  }

  /**
   * Generate an image job and track its progress
   */
  async generateImageJob(
    prompt: string,
    imageId: string,
    loraId: string | null = null,
  ): Promise<unknown> {
    // Check safety first
    const safetyResult = await this.checkPromptSafety(prompt);
    const safetyData = safetyResult.result.data.json;
    
    if (this.isPromptSafe(safetyData)) {
      return this.processImageGeneration(prompt, imageId, loraId);
    } else {
      this.statusService?.updateImageStatus(
        imageId,
        "FAILED",
        "String is unsafe, please check your input."
      );
      return { error: "String is unsafe, please check your input." };
    }
  }

  /**
   * Check if prompt is safe
   */
  private isPromptSafe(safetyData: SafetyCheckResult): boolean {
    return !(
      safetyData.stringIsUnsafe || 
      safetyData.hasCSAM || 
      safetyData.hasSelfHarm
    );
  }

  /**
   * Process the image generation job
   */
  private async processImageGeneration(
    prompt: string,
    imageId: string,
    loraId: string | null = null,
  ): Promise<unknown> {
    const imageJobId = await this.createImageJob(prompt, loraId);
    let jobResult = await this.getImageJobById(imageJobId);
    let jobData = jobResult.result.data.json;

    let oldStatus = null;
    let oldB64 = null;

    // Poll until job completes
    while (jobData.status !== "SUCCEEDED") {
      await this.sleep(1000);

      // Update status if changed
      if (jobData.status !== oldStatus) {
        this.statusService?.updateImageStatus(imageId, "STARTING");
        oldStatus = jobData.status;
      }

      // Save intermediate image if available
      if (jobData.imageB64 && jobData.imageB64 !== oldB64) {
        await this.imageService?.saveBase64Image(
          jobData.imageB64,
          imageId,
          false,
        );
        this.statusService?.updateImageStatus(imageId, "PENDING");
        oldB64 = jobData.imageB64;
      }

      // Get latest job status
      jobResult = await this.getImageJobById(imageJobId);
      jobData = jobResult.result.data.json;
    }

    // Download final image and update status
    await this.imageService?.downloadImage(jobData.outputUrl, imageId);
    this.statusService?.updateImageStatus(imageId, "COMPLETED");
    return jobData.outputUrl;
  }

  /**
   * Generate an image using the puppeteer instance
   */
  async generateImage(
    prompt: string,
    imageId: string,
    loraId: string | null = null,
  ): Promise<unknown> {
    this.ensurePageInitialized();
    
    return this.page!.evaluate(
      async (prompt, imageId, loraId) => {
        return await this.generateImageJob(prompt, imageId, loraId);
      },
      prompt,
      imageId,
      loraId,
    );
  }

  /**
   * Ensure the puppeteer page is initialized
   */
  private ensurePageInitialized(): void {
    if (!this.page) {
      throw new Error(
        "Puppeteer page is not initialized. Call initPuppeteer() first."
      );
    }
  }

  /**
   * Search for Loras
   */
  async searchLoras(query: string): Promise<Lora[]> {
    this.ensurePageInitialized();
    
    if (!query) {
      throw new Error("Query is required for Lora search.");
    }

    return this.page!.evaluate(async (query) => {
      const loraSearchRequest = await this.getModelSuggestions(query);
      return loraSearchRequest.result.data.json.map((item: ModelSuggestion) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        image: item.ImageLoraTrainingJob[0]?.UploadedTrainingImage[0]?.url,
        tags: [
          item.isNSFW ? "NSFW" : undefined,
          item.isPublic ? "Public" : "Private",
        ].filter(Boolean) as string[],
        triggers: item.triggers,
      }));
    }, query);
  }

  /**
   * Search for audio models
   */
  async searchAudioModels(query: string): Promise<AudioModel[]> {
    this.ensurePageInitialized();
    
    if (!query) {
      throw new Error("Query is required for audio model search.");
    }

    return this.page!.evaluate(async (query) => {
      const modelSearchRequest = await this.getAudioModels(query);
      return modelSearchRequest.result.data.json.map((item: AudioModel) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        image: item.image,
      }));
    }, query);
  }

  /**
   * Create an audio job and wait for completion
   */
  async createAudioJob(
    audioModelId: string,
    prompt?: string,
    inputUrl?: string,
    pitch: string = "0",
    male: string = "true"
  ): Promise<string> {
    this.ensurePageInitialized();
    
    if (!prompt && !audioModelId) {
      throw new Error("Prompt or audioModelId is required for audio job.");
    }

    return this.page!.evaluate(async (audioModelId, prompt, inputUrl, pitch, male) => {
      // Create the job
      const jobId = await this.createCoverStemOrTtsJob(
        audioModelId, 
        prompt, 
        inputUrl, 
        parseInt(pitch), 
        JSON.parse(male)
      );
      await this.sleep(1000);

      // Poll until output is available
      const outputUrl = "https://tracks.weights.com/" + jobId + "/output_track.mp3";
      let available = false;
      
      while (!available) {
        try {
          const response = await fetch(outputUrl);
          const text = await response.text();
          if (!text.includes("Error 404")) {
            available = true;
          } else {
            await this.sleep(1000);
          }
        } catch (e) {
          await e;
          await this.sleep(1000);
        }
      }

      return outputUrl;
    }, audioModelId, prompt, inputUrl, pitch, male);
  }

  /**
   * Get user quotas
   */
  async getQuotas(): Promise<unknown> {
    this.ensurePageInitialized();
    
    return this.page!.evaluate(async () => {
      const usageResponse = await this.getUsage();
      return usageResponse.result.data.json;
    });
  }
}

export default DirectApiService;