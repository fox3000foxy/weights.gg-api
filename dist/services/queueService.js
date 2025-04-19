"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Queue = void 0;
class Queue {
    constructor(maxSize = 10) {
        this.queue = [];
        this.searchingQueue = [];
        this.maxSize = maxSize;
        this.processing = false;
        this.processingSearch = false;
        this.processor = null;
        this.processorSearch = null;
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
    enqueueSearch(item, page) {
        if (this.searchingQueue.length >= this.maxSize) {
            throw new Error("Queue is full");
        }
        this.searchingQueue.push(item);
        if (!this.processingSearch && this.processorSearch) {
            this.processSearch(this.processorSearch, page);
        }
    }
    dequeue() {
        return this.queue.shift();
    }
    dequeueSearch() {
        return this.searchingQueue.shift();
    }
    isEmpty() {
        return this.queue.length === 0;
    }
    isEmptySearch() {
        return this.searchingQueue.length === 0;
    }
    async process(processor, page) {
        if (this.processing)
            return;
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
        }
        finally {
            this.processing = false;
        }
    }
    async processSearch(processorSearch, page) {
        if (this.processingSearch)
            return;
        this.processorSearch = processorSearch;
        this.processingSearch = true;
        try {
            while (!this.isEmptySearch()) {
                const item = this.dequeueSearch();
                if (item) {
                    await processorSearch(item.job, page);
                }
            }
        }
        finally {
            this.processingSearch = false;
        }
    }
}
exports.Queue = Queue;
exports.default = Queue;
