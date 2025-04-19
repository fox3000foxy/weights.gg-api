import { Page } from "rebrowser-puppeteer-core";
import { JobQueueItem, JobSearchQueueItem, ProcessorFunction, SearchProcessorFunction } from "../types";
export declare class Queue {
    queue: JobQueueItem[];
    searchingQueue: JobSearchQueueItem[];
    private maxSize;
    processing: boolean;
    processingSearch: boolean;
    processor: ProcessorFunction | null;
    processorSearch: SearchProcessorFunction | null;
    constructor(maxSize?: number);
    enqueue(item: JobQueueItem, page: Page): void;
    enqueueSearch(item: JobSearchQueueItem, page: Page): void;
    dequeue(): JobQueueItem | undefined;
    dequeueSearch(): JobSearchQueueItem | undefined;
    isEmpty(): boolean;
    isEmptySearch(): boolean;
    process(processor: ProcessorFunction, page: Page): Promise<void>;
    processSearch(processorSearch: SearchProcessorFunction, page: Page): Promise<void>;
}
export default Queue;
export { ProcessorFunction };
