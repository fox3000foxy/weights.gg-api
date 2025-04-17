// src/types/index.ts

import { EventEmitter } from 'events';

export interface Job {
    prompt: string;
    loraName: string | null;
    imageId: string;
    emitter: EventEmitter;  // Type this properly
}

export interface ImageResult {
    url: string;
    error?: string;
}

export interface LoraSearchResult {
    id: string;
    name: string;
    // Add other relevant fields as necessary
}

export interface StatusUpdate {
    imageId: string;
    status: 'STARTING' | 'COMPLETED' | 'FAILED' | 'PENDING';
    error?: string | null;
}

export const EVENT_TYPES = {
    PREVIEW_UPDATE: 'preview:update',
    STATUS_UPDATE: 'status:update'
} as const;

