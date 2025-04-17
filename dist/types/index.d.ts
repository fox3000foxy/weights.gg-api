/// <reference types="node" />
import { EventEmitter } from 'events';
import { Response } from 'express';
import { Page } from 'rebrowser-puppeteer-core';
export interface ConnectOptions {
    headless: boolean;
    args: string[];
    customConfig: Record<string, unknown>;
    turnstile: boolean;
    connectOption: Record<string, unknown>;
    disableXvfb: boolean;
    ignoreAllFlags: boolean;
}
export declare const EVENT_TYPES: {
    readonly PREVIEW_UPDATE: "preview:update";
    readonly STATUS_UPDATE: "status:update";
};
export interface GenerateImageJob {
    prompt: string;
    loraName?: string;
    imageId: string;
    res: Response;
    emitter: EventEmitter;
}
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
export interface LoraResult {
    name: string;
    image: string;
    tags: string[];
}
export interface LoraSearchResult {
    id: string;
    name: string;
}
export type ProcessorFunction = (item: QueueItem, page: Page) => Promise<void>;
export interface QueueItem {
    id: string;
    data: any;
}
export interface SearchLoraJob {
    query: string;
    res: Response;
    searchId: string;
    id: string;
    data: any;
}
export interface StatusUpdate {
    imageId: string;
    status: 'STARTING' | 'COMPLETED' | 'FAILED' | 'PENDING';
    error?: string | null;
}
