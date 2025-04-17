class Queue {
    constructor(maxSize = 10) {
        this.queue = [];
        this.maxSize = maxSize;
        this.processing = false;
        this.processor = null; // Add this to store the processor function
    }

    enqueue(item) {
        if (this.queue.length >= this.maxSize) {
            throw new Error("Queue is full");
        }
        this.queue.push(item);
        // Start processing if not already processing
        if (!this.processing && this.processor) {
            this.process(this.processor);
        }
    }

    dequeue() {
        return this.queue.shift();
    }

    isEmpty() {
        return this.queue.length === 0;
    }

    async process(processor) {
        if (this.processing) return;
        
        this.processor = processor; // Store the processor function
        this.processing = true;

        try {
            while (!this.isEmpty()) {
                const item = this.dequeue();
                await processor(item);
            }
        } finally {
            this.processing = false;
        }
    }
}

module.exports = Queue;