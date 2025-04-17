import { Page } from "rebrowser-puppeteer-core";
interface QueueItem {
    id: string;
    data: any;
}

type ProcessorFunction = (item: QueueItem, page: Page) => Promise<void>;

export class Queue {
    public queue: QueueItem[];
    private maxSize: number;
    public processing: boolean;
    public processor: ProcessorFunction | null;

    constructor(maxSize: number = 10) {
        this.queue = [];
        this.maxSize = maxSize;
        this.processing = false;
        this.processor = null;
    }

    public enqueue(item: QueueItem, page: Page): void {
        if (this.queue.length >= this.maxSize) {
            throw new Error("Queue is full");
        }
        this.queue.push(item);

        if (!this.processing && this.processor) {
            this.process(this.processor, page);
        }
    }

    public dequeue(): QueueItem | undefined {
        return this.queue.shift();
    }

    public isEmpty(): boolean {
        return this.queue.length === 0;
    }

    public async process(processor: ProcessorFunction, page: Page): Promise<void> {
        if (this.processing) return;
        
        this.processor = processor;
        this.processing = true;

        try {
            while (!this.isEmpty()) {
                const item = this.dequeue();
                if (item) {
                    await processor(item, page);
                }
            }
        } finally {
            this.processing = false;
        }
    }
}

export default Queue;
export { QueueItem, ProcessorFunction };