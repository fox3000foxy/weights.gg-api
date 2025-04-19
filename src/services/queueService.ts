import { Page } from "rebrowser-puppeteer-core";
import {
  JobQueueItem,
  JobSearchQueueItem,
  ProcessorFunction,
  SearchProcessorFunction,
} from "../types";

export class Queue {
  public queue: JobQueueItem[];
  public searchingQueue: JobSearchQueueItem[];
  private maxSize: number;
  public processing: boolean;
  public processingSearch: boolean;
  public processor: ProcessorFunction | null;
  public processorSearch: SearchProcessorFunction | null;

  constructor(maxSize: number = 10) {
    this.queue = [];
    this.searchingQueue = [];
    this.maxSize = maxSize;
    this.processing = false;
    this.processingSearch = false;
    this.processor = null;
    this.processorSearch = null;
  }

  public enqueue(item: JobQueueItem, page: Page): void {
    if (this.queue.length >= this.maxSize) {
      throw new Error("Queue is full");
    }
    this.queue.push(item);

    if (!this.processing && this.processor) {
      this.process(this.processor, page);
    }
  }

  public enqueueSearch(item: JobSearchQueueItem, page: Page): void {
    if (this.searchingQueue.length >= this.maxSize) {
      throw new Error("Queue is full");
    }
    this.searchingQueue.push(item);

    if (!this.processing && this.processor) {
      this.process(this.processor, page);
    }
  }

  public dequeue(): JobQueueItem | undefined {
    return this.queue.shift();
  }

  public dequeueSearch(): JobSearchQueueItem | undefined {
    return this.searchingQueue.shift();
  }

  public isEmpty(): boolean {
    return this.queue.length === 0;
  }

  public isEmptySearch(): boolean {
    return this.searchingQueue.length === 0;
  }

  public async process(
    processor: ProcessorFunction,
    page: Page,
  ): Promise<void> {
    if (this.processing) return;

    this.processor = processor;
    this.processing = true;

    try {
      while (!this.isEmpty()) {
        const item = this.dequeue();
        if (item?.id === undefined) {
          console.error("Item ID is undefined");
          continue;
        }
        if (item) {
          await processor(item.job, page);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  public async processSearch(
    processorSearch: SearchProcessorFunction,
    page: Page,
  ): Promise<void> {
    if (this.processingSearch) return;

    this.processorSearch = processorSearch;
    this.processingSearch = true;

    try {
      while (!this.isEmpty()) {
        const item = this.dequeueSearch();
        if (item) {
          await processorSearch(item.job, page);
        }
      }
    } finally {
      this.processingSearch = false;
    }
  }
}

export default Queue;
export { ProcessorFunction };
