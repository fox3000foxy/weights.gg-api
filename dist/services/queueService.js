"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Queue = void 0;
class Queue {
    constructor(maxSize = 10) {
        this.queue = [];
        this.maxSize = maxSize;
        this.processing = false;
        this.processor = null;
    }
    enqueue(item, page) {
        if (this.queue.length >= this.maxSize) {
            throw new Error("Queue is full");
        }
        this.queue.push(item);
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
                if (item) {
                    await processor(item, page);
                }
            }
        }
        finally {
            this.processing = false;
        }
    }
}
exports.Queue = Queue;
exports.default = Queue;
