"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchQueue = exports.ImageQueue = exports.Queue = void 0;
const events_1 = require("events");
class Queue extends events_1.EventEmitter {
    constructor(maxSize = 10) {
        super();
        this.queue = [];
        this.maxSize = maxSize;
        this.processing = false;
        this.processor = null;
    }
    enqueue(item, page) {
        if (this.queue.length >= this.maxSize) {
            this.emit("error", new Error("Queue is full"));
            throw new Error("Queue is full");
        }
        this.queue.push(item);
        this.emit("enqueued", item);
        if (!this.processing && this.processor) {
            this.process(this.processor, page);
        }
    }
    dequeue() {
        return this.queue.shift();
    }
    isEmpty() {
        return this.queue.length === 0;
    }
    async process(processor, page) {
        if (this.processing)
            return;
        this.processor = processor;
        this.processing = true;
        try {
            while (!this.isEmpty()) {
                const item = this.dequeue();
                if (!item?.id) {
                    console.error("Item ID is undefined");
                    continue;
                }
                await processor(item.job, page);
            }
        }
        catch (error) {
            console.error("Error processing queue item:", error);
        }
        finally {
            this.processing = false;
        }
    }
    // Additional methods
    clear() {
        this.queue = [];
    }
    get size() {
        return this.queue.length;
    }
    get isProcessing() {
        return this.processing;
    }
    pause() {
        this.processing = false;
    }
    resume(page) {
        if (this.processor && !this.processing) {
            this.process(this.processor, page);
        }
    }
}
exports.Queue = Queue;
class ImageQueue extends Queue {
}
exports.ImageQueue = ImageQueue;
class SearchQueue extends Queue {
}
exports.SearchQueue = SearchQueue;
