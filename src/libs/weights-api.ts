import fetch from "node-fetch";
import { RequestInit } from "node-fetch";

export class WeightsApi {
  constructor(apiKey: string | null, endpoint: string | null = null) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }
  private apiKey: string | null = null;
  private endpoint: string | null = null;
  /**
   * Makes an HTTP request to the API endpoint.
   * @param path - The API endpoint path.
   * @param method - The HTTP method (default: 'GET').
   * @param body - The request body (optional).
   * @returns Promise<Response>
   */
  async apiCall(
    path: string,
    method: string = "GET",
    body: { [key: string]: object | string | null } | null = null,
  ) {
    const options: RequestInit = {
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
    } else if (body) {
      options.body = JSON.stringify(body);
    }
    const response = await fetch(url, options);
    if (response.ok) {
      return response;
    } else {
      throw new Error(
        `Error: ${response.status} - ${JSON.stringify(response)}`,
      );
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
    } catch (error: Error | unknown) {
      throw new Error(
        `Weights API Error: The API is not reachable. Please check your connection or the API status. ${error}`,
      );
    }
  }

  /**
   * Wraps API calls with health check
   * @param apiCall - The API call to make
   * @returns Promise<T>
   */
  async callWithHealthCheck<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
      await this.getHealthData();
      return await apiCall();
    } catch (error: Error | unknown) {
      if (error instanceof Error) {
        throw new Error(
          `Weights API Error: The API is not reachable. Please check your connection or the API status.`,
        );
      }
      throw error;
    }
  }

  /**
   * Gets the status of a specific image.
   * @param params - Object containing imageId.
   * @returns Promise with status information.
   */
  getStatus = async (params: { imageId: string }) => {
    return this.callWithHealthCheck(() =>
      this.apiCall("/status/" + params.imageId, "GET").then((response) =>
        response.json(),
      ),
    );
  };

  /**
   * Retrieves quota information.
   * @returns Promise with quota data.
   */
  getQuota = async () => {
    return this.callWithHealthCheck(() =>
      this.apiCall("/quota", "GET").then((response) => response.text()),
    );
  };

  /**
   * Searches for Lora models.
   * @param params - Object containing search query.
   * @returns Promise with search results.
   */
  searchLoras = async (params: { query: string }) => {
    return this.callWithHealthCheck(() =>
      this.apiCall("/search-loras", "GET", params).then((response) =>
        response.json(),
      ),
    );
  };

  /**
   * Generates an image based on parameters.
   * @param params - Object containing query and optional loraName.
   * @returns Promise with generation results.
   */
  generateImage = async (params: {
    prompt: string;
    loraName: string | null;
  }) => {
    return this.callWithHealthCheck(() =>
      this.apiCall("/generateImage", "GET", params).then((response) =>
        response.json(),
      ),
    );
  };

  /**
   * Generates a progressive image based on parameters.
   * @param params - Object containing query and optional loraName.
   * @param callback - Function to call with status updates.
   * @returns Promise with generation results.
   */
  generateProgressiveImage = async (
    params: { prompt: string; loraName: string | null },
    callback: (status: string, data: { imageId: string }) => unknown = (
      status: string,
    ) => {
      return status;
    },
  ) => {
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
}
