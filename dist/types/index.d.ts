/// <reference types="node" />
import { EventEmitter } from "events";
import { Response } from "express";
import { Page } from "rebrowser-puppeteer-core";
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
export declare const EVENT_TYPES: {
    readonly PREVIEW_UPDATE: "preview:update";
    readonly STATUS_UPDATE: "status:update";
};
export interface ImageGenerationResult {
    url?: string;
    imageId?: string;
    error?: string;
}
export interface ImageResult {
    url: string;
    error?: string;
}
export interface Job {
    prompt: string;
    loraName: string | null;
    imageId: string;
    emitter: EventEmitter;
}
export interface GenerateImageJob extends Job {
    res: Response;
}
export interface LoraResult {
    name: string;
    image: string;
    tags: string[];
}
export interface LoraSearchResult {
    id: string;
    name: string;
}
export interface LoraSearchJob {
    query: string;
    res: Response;
}
export type ProcessorFunction = (job: Job, page: Page) => Promise<void>;
export type SearchProcessorFunction = (job: LoraSearchJob, page: Page) => Promise<void>;
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
export interface SearchLoraJob extends LoraSearchJob {
    searchId: string;
    id: string;
    data: object;
}
export interface StatusUpdate {
    imageId: string;
    status: "STARTING" | "COMPLETED" | "FAILED" | "PENDING";
    error?: string | null;
}
