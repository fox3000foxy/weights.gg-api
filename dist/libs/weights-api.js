"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeightsApi = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
// Example usage:
/*
import { WeightsApi } from './weights-api';
const api = new WeightsApi('your-api-key');

// Get health status
api.getHealthData()
  .then(data => console.log('Health:', data))
  .catch(err => console.error(err));

// Search for Loras
api.searchLoras({ query: 'anime' })
  .then(results => console.log('Loras:', results))
  .catch(err => console.error(err));

// Generate an image
api.generateImage({ query: 'beautiful landscape', loraName: null })
  .then(result => console.log('Image:', result))
  .catch(err => console.error(err));

// Generate progressive image with status updates
api.generateProgressiveImage(
  { query: 'sunset beach', loraName: null },
  (status) => console.log('Status:', status)
)
  .then(result => console.log('Final result:', result))
  .catch(err => console.error(err));
*/
class WeightsApi {
    constructor(apiKey) {
        this.apiKey = null;
        this.endpoint = process.env.WEIGHTS_UNOFFICIAL_ENDPOINT || "http://localhost:3000";
        /**
         * Retrieves health status of the API.
         * @returns Promise with health data.
         */
        this.getHealthData = async () => {
            await this.apiCall("/health", "GET")
                .then((response) => response.json())
                .then((response) => {
                if (response.ok) {
                    return response;
                }
                else {
                    throw new Error(`Error: ${response.status} - ${response}`);
                }
            });
        };
        /**
         * Gets the status of a specific image.
         * @param params - Object containing imageId.
         * @returns Promise with status information.
         */
        this.getStatus = async (params) => {
            try {
                await this.getHealthData();
            }
            catch (error) {
                if (error instanceof Error) {
                    throw new Error(`Weights API Error: The API is not reachable. Please check your connection or the API status.`);
                }
            }
            return this.apiCall("/status/" + params.imageId, "GET").then((response) => response.json());
        };
        /**
         * Retrieves quota information.
         * @returns Promise with quota data.
         */
        this.getQuota = async () => {
            try {
                await this.getHealthData();
            }
            catch (error) {
                if (error instanceof Error) {
                    throw new Error(`Weights API Error: The API is not reachable. Please check your connection or the API status.`);
                }
            }
            return this.apiCall("/quota", "GET").then((response) => response.text());
        };
        /**
         * Searches for Lora models.
         * @param params - Object containing search query.
         * @returns Promise with search results.
         */
        this.searchLoras = async (params) => {
            try {
                await this.getHealthData();
            }
            catch (error) {
                if (error instanceof Error) {
                    throw new Error(`Weights API Error: The API is not reachable. Please check your connection or the API status.`);
                }
            }
            return this.apiCall("/search-loras", "GET", params).then((response) => response.json());
        };
        /**
         * Generates an image based on parameters.
         * @param params - Object containing query and optional loraName.
         * @returns Promise with generation results.
         */
        this.generateImage = async (params) => {
            try {
                await this.getHealthData();
            }
            catch (error) {
                if (error instanceof Error) {
                    throw new Error(`Weights API Error: The API is not reachable. Please check your connection or the API status.`);
                }
            }
            return this.apiCall("/generateImage", "GET", params).then((response) => response.json());
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
            try {
                await this.getHealthData();
            }
            catch (error) {
                if (error instanceof Error) {
                    throw new Error(`Weights API Error: The API is not reachable. Please check your connection or the API status.`);
                }
            }
            const { imageId } = await this.generateImage(params);
            const statusResponse = await this.getStatus({ imageId });
            const { status } = statusResponse;
            let oldModifiedDate = null;
            while (status !== "COMPLETED") {
                await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for 100 milliseconds
                const statusResponse = await this.getStatus({ imageId });
                const { status } = statusResponse;
                const lastModifiedDate = statusResponse.lastModifiedDate || null;
                if (oldModifiedDate !== lastModifiedDate) {
                    oldModifiedDate = lastModifiedDate;
                    callback(status);
                }
            }
            return statusResponse;
        };
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
            throw new Error(`Error: ${response.status} - ${response}`);
        }
    }
}
exports.WeightsApi = WeightsApi;
