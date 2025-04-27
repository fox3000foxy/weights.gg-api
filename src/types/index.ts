import { Response } from "express";
import { Page } from "rebrowser-puppeteer-core";

// Constants
export const EVENT_TYPES = {
  PREVIEW_UPDATE: "preview:update",
  STATUS_UPDATE: "status:update",
} as const;

export const TYPES = {
  Config: Symbol.for("Config"),
  DirectApiService: Symbol.for("DirectApiService"),
  ImageService: Symbol.for("ImageService"),
  StatusService: Symbol.for("StatusService"),
  LoraService: Symbol.for("LoraService"),
  Application: Symbol.for("Application"),
};

// Enums
export enum Status {
  STARTING = "STARTING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  PENDING = "PENDING",
  QUEUED = "QUEUED",
}

// General Interfaces
export interface ConnectOptions {
  headless: boolean;
  args: string[];
  customConfig: Record<string, unknown>;
  turnstile: boolean;
  connectOption: Record<string, unknown>;
  disableXvfb: boolean;
  ignoreAllFlags: boolean;
}

export interface QueueItem<T> {
  id: string;
  data: object;
  job: T;
}

export interface Job {
  prompt: string;
  loraName: string | null;
  imageId: string;
}

export interface GenerateImageJob extends Job {
  res: Response;
}

export interface JobQueueItem {
  id: string;
  data: object;
  job: Job;
}

export interface JobSearchQueueItem {
  id: string;
  data: object;
  job: LoraSearchJob;
}

// Image-Related Interfaces
export interface ImageGenerationResult {
  url?: string;
  imageId?: string;
  error?: string;
}

export interface ImageResult {
  url: string;
  error?: string;
}

export interface ImageStatus {
  status: string;
  lastModifiedDate?: number;
  error: string | null;
}

export interface ImageJobResult {
  status: string;
  outputUrl: string;
  imageB64?: string;
}

export interface CreateImageJobBody {
  json: {
    prompt: string;
    seed: string | null;
    loraId: string | null;
    secondaryLoraId: string | null;
    tertiaryLoraId: string | null;
    dimensions: string;
    inputImageUrl: string | null;
    templatePromptId: string | null;
  };
  meta: {
    values: {
      seed?: string[];
      loraId?: string[];
      secondaryLoraId?: string[];
      tertiaryLoraId?: string[];
      inputImageUrl?: string[];
      templatePromptId?: string[];
    };
  };
}

// Audio-Related Interfaces
export interface CreateAudioJobBody {
  json: {
    rvcModelId: string;
    duetRvcModelId: string | undefined;
    inputUrl: string | undefined;
    ttsText: string;
    ttsBaseModel: string;
    origin: string;
    inputType: string;
    inputFileName: string | undefined;
    pitch: number;
    instrumentalPitch: undefined;
    deEcho: undefined;
    isolateMainVocals: undefined;
    consonantProtection: undefined;
    volumeEnvelope: undefined;
    preStemmed: boolean;
    modelRegions: undefined;
  };
  meta: {
    values: {
      rvcModelId?: string[];
      duetRvcModelId?: string[];
      inputUrl?: string[];
    };
  };
}

export interface AudioModel {
  id: string;
  title: string;
  content: string;
  image: string;
}

// Lora-Related Interfaces
export interface Lora {
  id: string;
  name: string;
  description: string;
  image?: string;
  tags: string[];
  triggers: string[];
}

export interface LoraResult {
  id: string;
  name: string;
  description: string;
  image?: string;
  tags: string[];
  triggers: string[];
}

export interface LoraSearchResult {
  id: string;
  name: string;
}

export interface LoraSearchJob {
  query: string;
  res: Response;
}

export interface SearchLoraJob extends LoraSearchJob {
  searchId: string;
  id: string;
  data: object;
}

// Model-Related Interfaces
export interface ModelSuggestion {
  id: string;
  name: string;
  description: string;
  ImageLoraTrainingJob: Array<{
    UploadedTrainingImage: Array<{ url: string }>;
  }>;
  isNSFW: boolean;
  isPublic: boolean;
  triggers: string[];
}

// Status-Related Interfaces
export interface StatusUpdate {
  imageId: string;
  status: Status;
  lastModifiedDate: string | null;
  error?: string | null;
}

// Safety Check Interfaces
export interface SafetyCheckResult {
  stringIsUnsafe: boolean;
  hasCSAM: boolean;
  hasSelfHarm: boolean;
}

// Processor Functions
export type ProcessorFunction = (job: Job, page: Page) => Promise<void>;
export type SearchProcessorFunction = (job: LoraSearchJob, page: Page) => Promise<void>;
