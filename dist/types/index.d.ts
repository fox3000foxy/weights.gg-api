/// <reference types="node" />
import { EventEmitter } from 'events';
import { Page } from 'rebrowser-puppeteer-core';
import { Response } from 'express';
export interface Job {
    prompt: string;
    loraName: string | null;
    imageId: string;
    emitter: EventEmitter;
}
export interface ImageResult {
    url: string;
    error?: string;
}
export interface LoraSearchResult {
    id: string;
    name: string;
}
export interface StatusUpdate {
    imageId: string;
    status: 'STARTING' | 'COMPLETED' | 'FAILED' | 'PENDING';
    error?: string | null;
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
export interface ConnectOptions {
    headless: boolean;
    args: string[];
    customConfig: Record<string, unknown>;
    turnstile: boolean;
    connectOption: Record<string, unknown>;
    disableXvfb: boolean;
    ignoreAllFlags: boolean;
}
export interface GenerateImageJob {
    prompt: string;
    loraName?: string;
    imageId: string;
    res: Response;
    emitter: EventEmitter;
}
export interface SearchLoraJob {
    query: string;
    res: Response;
    searchId: string;
    id: string;
    data: any;
}
export interface QueueItem {
    id: string;
    data: any;
}
export interface LoraResult {
    name: string;
    image: string;
    tags: string[];
}
export interface LoraResult {
    name: string;
    image: string;
    tags: string[];
}
export type ProcessorFunction = (item: QueueItem, page: Page) => Promise<void>;
