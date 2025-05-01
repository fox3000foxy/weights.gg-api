import { EventEmitter } from "events";
import { Job, LoraSearchJob, QueueItem } from "types";
import { injectable } from "inversify";

export interface IQueue<T> extends EventEmitter {
  enqueue(item: QueueItem<T>): void;
  dequeue(): QueueItem<T> | undefined;
  isEmpty(): boolean;
  process(processor: (job: T) => Promise<void>): Promise<void>;
  clear(): void;
  readonly size: number;
  readonly isProcessing: boolean;
  pause(): void;
  resume(): void;
}

export type IImageQueue = IQueue<Job>
export type ISearchQueue = IQueue<LoraSearchJob>

@injectable()
export class Queue<T> extends EventEmitter {
  private queue: QueueItem<T>[];
  private maxSize: number;
  private processing: boolean;
  private processor: ((job: T) => Promise<void>) | null;

  constructor(maxSize: number = 10) {
    super();
    this.queue = [];
    this.maxSize = maxSize;
    this.processing = false;
    this.processor = null;
  }

  public enqueue(item: QueueItem<T>): void {
    if (this.queue.length >= this.maxSize) {
      this.emit("error", new Error("Queue is full"));
      throw new Error("Queue is full");
    }
    this.queue.push(item);
    this.emit("enqueued", item);

    if (!this.processing && this.processor) {
      this.process(this.processor);
    }
  }

  public dequeue(): QueueItem<T> | undefined {
    return this.queue.shift();
  }

  public isEmpty(): boolean {
    return this.queue.length === 0;
  }

  public async process(
    processor: (job: T) => Promise<void>
  ): Promise<void> {
    if (this.processing) return;

    this.processor = processor;
    this.processing = true;

    try {
      while (!this.isEmpty()) {
        const item = this.dequeue();
        if (!item?.id) {
          console.error("Item ID is undefined");
          continue;
        }
        await processor(item.job);
      }
    } catch (error) {
      console.error("Error processing queue item:", error);
    } finally {
      this.processing = false;
    }
  }

  // Additional methods
  public clear(): void {
    this.queue = [];
  }

  public get size(): number {
    return this.queue.length;
  }

  public get isProcessing(): boolean {
    return this.processing;
  }

  public pause(): void {
    this.processing = false;
  }

  public resume(): void {
    if (this.processor && !this.processing) {
      this.process(this.processor);
    }
  }
}

@injectable()
export class ImageQueue extends Queue<Job> {}

@injectable()
export class SearchQueue extends Queue<LoraSearchJob> {}
