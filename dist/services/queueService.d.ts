/// <reference types="node" />
import { Page } from "rebrowser-puppeteer-core";
import { EventEmitter } from "events";
import { Job, LoraSearchJob, QueueItem } from "types";
export declare class Queue<T> extends EventEmitter {
    private queue;
    private maxSize;
    private processing;
    private processor;
    constructor(maxSize?: number);
    enqueue(item: QueueItem<T>, page: Page): void;
    dequeue(): QueueItem<T> | undefined;
    isEmpty(): boolean;
    process(processor: (job: T, page: Page) => Promise<void>, page: Page): Promise<void>;
    clear(): void;
    get size(): number;
    get isProcessing(): boolean;
    pause(): void;
    resume(page: Page): void;
}
export declare class ImageQueue extends Queue<Job> {
}
export declare class SearchQueue extends Queue<LoraSearchJob> {
}
