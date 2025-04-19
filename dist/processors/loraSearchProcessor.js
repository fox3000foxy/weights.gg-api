"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoraSearchProcessor = void 0;
class LoraSearchProcessor {
    constructor(loraService) {
        this.loraService = loraService;
    }
    async processLoraSearch(job, loraSearchPage) {
        const { query, res } = job;
        try {
            if (this.loraService.loraSearchCache.has(query)) {
                console.log(`Using cached result for Lora search: ${query}`);
                const cachedResult = this.loraService.loraSearchCache.get(query);
                res.send(cachedResult);
                return;
            }
            const searchResult = await this.performLoraSearch(query, loraSearchPage);
            res.send(searchResult);
        }
        catch (error) {
            console.error("Error during Lora search:", error);
            res.send([]);
        }
    }
    async performLoraSearch(query, loraSearchPage) {
        let timeoutId = null;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error("Lora search timed out"));
            }, 5000); // 5 seconds timeout
        });
        try {
            const result = await Promise.race([
                this.loraService.searchLoras(query, loraSearchPage),
                timeoutPromise,
            ]);
            if (result?.length !== 0) {
                this.loraService.loraSearchCache.set(query, result);
                this.loraService.saveLoraCache(); // Save the cache after updating it
            }
            if (timeoutId)
                clearTimeout(timeoutId);
            return result;
        }
        catch (error) {
            if (timeoutId)
                clearTimeout(timeoutId);
            throw error;
        }
    }
}
exports.LoraSearchProcessor = LoraSearchProcessor;
exports.default = LoraSearchProcessor;
