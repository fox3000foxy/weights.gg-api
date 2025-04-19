"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeightsApi = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
class WeightsApi {
    constructor(apiKey, endpoint = null) {
        this.apiKey = null;
        this.endpoint = null;
        /**
         * Gets the status of a specific image.
         * @param params - Object containing imageId.
         * @returns Promise with status information.
         */
        this.getStatus = async (params) => {
            return this.callWithHealthCheck(() => this.apiCall("/status/" + params.imageId, "GET").then((response) => response.json()));
        };
        /**
         * Retrieves quota information.
         * @returns Promise with quota data.
         */
        this.getQuota = async () => {
            return this.callWithHealthCheck(() => this.apiCall("/quota", "GET").then((response) => response.text()));
        };
        /**
         * Searches for Lora models.
         * @param params - Object containing search query.
         * @returns Promise with search results.
         */
        this.searchLoras = async (params) => {
            return this.callWithHealthCheck(() => this.apiCall("/search-loras", "GET", params).then((response) => response.json()));
        };
        /**
         * Generates an image based on parameters.
         * @param params - Object containing query and optional loraName.
         * @returns Promise with generation results.
         */
        this.generateImage = async (params) => {
            return this.callWithHealthCheck(() => this.apiCall("/generateImage", "GET", params).then((response) => response.json()));
        };
        /**
         * Generates a progressive image based on parameters.
         * @param params - Object containing query and optional loraName.
         * @param callback - Function to call with status updates.
         * @returns Promise with generation results.
         */
        this.generateProgressiveImage = async (params, callback = (status) => {
            return status;
        }) => {
            await this.getHealthData();
            const { imageId } = await this.generateImage(params);
            const statusResponse = await this.getStatus({ imageId });
            const { status } = statusResponse;
            callback(status, { imageId });
            let oldModifiedDate = null;
            while (true) {
                await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for 100 milliseconds
                const statusResponse = await this.getStatus({ imageId });
                const { status } = statusResponse;
                const lastModifiedDate = statusResponse.lastModifiedDate || null;
                const error = statusResponse.error || null;
                if (oldModifiedDate !== lastModifiedDate) {
                    oldModifiedDate = lastModifiedDate;
                    callback(status, { imageId });
                }
                if (status === "COMPLETED") {
                    break;
                }
                if (status === "FAILED") {
                    throw new Error("Image generation failed: " + error);
                }
            }
            return statusResponse;
        };
        this.endpoint = endpoint;
        this.apiKey = apiKey;
    }
    /**
     * Makes an HTTP request to the API endpoint.
     * @param path - The API endpoint path.
     * @param method - The HTTP method (default: 'GET').
     * @param body - The request body (optional).
     * @returns Promise<Response>
     */
    async apiCall(path, method = "GET", body = null) {
        const options = {
            method,
            headers: {
                "Content-Type": "application/json",
                "x-api-key": `${this.apiKey}`,
            },
        };
        let url = this.endpoint + path;
        if (method === "GET" && body) {
            const params = new URLSearchParams();
            for (const key in body) {
                if (Object.prototype.hasOwnProperty.call(body, key)) {
                    if (body[key] === null) {
                        continue;
                    }
                    params.append(key, String(body[key]));
                }
            }
            url += "?" + params.toString();
        }
        else if (body) {
            options.body = JSON.stringify(body);
        }
        const response = await (0, node_fetch_1.default)(url, options);
        if (response.ok) {
            return response;
        }
        else {
            throw new Error(`Error: ${response.status} - ${JSON.stringify(response)}`);
        }
    }
    /**
     * Retrieves health status of the API.
     * @returns Promise with health data.
     */
    async getHealthData() {
        try {
            const response = await this.apiCall("/health", "GET");
            return await response.json();
        }
        catch (error) {
            throw new Error(`Weights API Error: The API is not reachable. Please check your connection or the API status. ${error}`);
        }
    }
    /**
     * Wraps API calls with health check
     * @param apiCall - The API call to make
     * @returns Promise<T>
     */
    async callWithHealthCheck(apiCall) {
        try {
            await this.getHealthData();
            return await apiCall();
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Weights API Error: The API is not reachable. Please check your connection or the API status.`);
            }
            throw error;
        }
    }
}
exports.WeightsApi = WeightsApi;
