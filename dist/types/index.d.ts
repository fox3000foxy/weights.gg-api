/// <reference types="node" />
import { EventEmitter } from 'events';
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
