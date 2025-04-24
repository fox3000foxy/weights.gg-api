import { EventEmitter } from "events";
import { QueueItem } from "types";

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

