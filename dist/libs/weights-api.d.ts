import fetch from 'node-fetch';
export declare class WeightsApi {
    constructor(apiKey: string | null);
    private apiKey;
    private endpoint;
    /**
     * Makes an HTTP request to the API endpoint
     * @param path - The API endpoint path
     * @param method - The HTTP method (default: 'GET')
     * @param body - The request body (optional)
     * @returns Promise<Response>
     */
    apiCall(path: string, method?: string, body?: any): Promise<fetch.Response>;
    /**
     * Retrieves health status of the API
     * @returns Promise with health data
     */
    getHealthData: () => Promise<void>;
    /**
     * Gets the status of a specific image
     * @param params - Object containing imageId
     * @returns Promise with status information
     */
    getStatus: (params: {
        imageId: string;
    }) => Promise<any>;
    /**
     * Retrieves quota information
     * @returns Promise with quota data
     */
    getQuota: () => Promise<any>;
    /**
     * Searches for Lora models
     * @param params - Object containing search query
     * @returns Promise with search results
     */
    searchLoras: (params: {
        query: string;
    }) => Promise<any>;
    /**
     * Generates an image based on parameters
     * @param imageId - The ID for the generated image
     * @param params - Object containing query and optional loraName
     * @returns Promise with generation results
     */
    generateImage: (params: {
        query: string;
        loraName: string | null;
    }) => Promise<any>;
    /**
     * Generates a progressive image based on parameters
     * @param params - Object containing query and optional loraName
     * @param callback - Function to call with status updates
     * @returns Promise with generation results
     */
    generateProgressiveImage: (params: {
        query: string;
        loraName: string | null;
    }, callback?: Function) => Promise<any>;
}
