import { Page } from "rebrowser-puppeteer-core";
import { QueueItem, ProcessorFunction } from "../types";
export declare class Queue {
    queue: QueueItem[];
    private maxSize;
    processing: boolean;
    processor: ProcessorFunction | null;
    constructor(maxSize?: number);
    enqueue(item: QueueItem, page: Page): void;
    dequeue(): QueueItem | undefined;
    isEmpty(): boolean;
    process(processor: ProcessorFunction, page: Page): Promise<void>;
}
export default Queue;
export { QueueItem, ProcessorFunction };
