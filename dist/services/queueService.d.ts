import { Page } from "rebrowser-puppeteer-core";
interface QueueItem {
    id: string;
    data: any;
}
type ProcessorFunction = (item: QueueItem, page: Page) => Promise<void>;
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
