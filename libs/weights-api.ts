import fetch from "node-fetch";
import { RequestInit } from "node-fetch";

export enum HttpMethod {
  GET = "GET",
  POST = "POST",
}

export enum ImageStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export interface GenerationResult {
  imageId: string;
}

export interface HealthData {
  status: string;
}

export interface Lora {
  name: string;
  description: string;
  tags: string[];
  image: string;
}


export interface AudioModel {
  id: string,
  title: string,
  content: string,
  image: string,
}


export interface Params {
  [key: string]: object | string | null;
}

export interface GenerationParams extends Params {
  prompt: string;
  loraName: string | null;
}

export interface StatusResponse {
  status: ImageStatus;
  lastModifiedDate?: string;
  error?: string;
}

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
    method: HttpMethod = HttpMethod.GET,
    body: Params | null = null,
  ) {
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": `${this.apiKey}`,
      },
    };
    let url = this.endpoint + path;
    if (method === HttpMethod.GET && body) {
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
  async getHealthData(): Promise<HealthData> {
    try {
      const response = await this.apiCall("/health", HttpMethod.GET);
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
  getStatus = async (params: GenerationResult): Promise<StatusResponse> => {
    return this.callWithHealthCheck(() =>
      this.apiCall("/status/" + params.imageId, HttpMethod.GET).then(
        (response) => response.json(),
      ),
    );
  };

  /**
   * Retrieves quota information.
   * @returns Promise with quota data.
   */
  getQuota = async (): Promise<string> => {
    return this.callWithHealthCheck(() =>
      this.apiCall("/quota", HttpMethod.GET).then((response) =>
        response.text(),
      ),
    );
  };

  /**
   * Searches for Lora models.
   * @param params - Object containing search query.
   * @returns Promise with search results.
   */
  searchLoras = async (params: { query: string }): Promise<Lora[]> => {
    return this.callWithHealthCheck(() =>
      this.apiCall("/search-loras", HttpMethod.GET, params).then((response) =>
        response.json(),
      ),
    );
  };

  /**
   * Searches for audio models.
   * @param params - Object containing search query.
   * @returns Promise with search results.
   */
  searchAudioModels = async (params: { query: string }): Promise<AudioModel[]> => {
    return this.callWithHealthCheck(() =>
      this.apiCall("/search-voices-models", HttpMethod.GET, params).then(
        (response) => response.json(),
      ),
    );
  }

  /**
   * Generates an image based on parameters.
   * @param params - Object containing query and optional loraName.
   * @returns Promise with generation results.
   */
  generateImage = async (
    params: GenerationParams,
  ): Promise<GenerationResult> => {
    return this.callWithHealthCheck(() =>
      this.apiCall("/generateImage", HttpMethod.GET, params).then((response) =>
        response.json(),
      ),
    );
  };

  /**
   * Generates audio from text.
   * @param voiceModelId - The ID of the voice model to use.
   * @param text - The text to convert to speech.
   * @param pitch - The pitch of the voice (optional).
   * @returns Promise with generation results.
   */
  generateFromTTS = async (
    voiceModelName: string,
    text: string,
    pitch: number = 0,
  ): Promise<{result: string}> => {
    return this.callWithHealthCheck(() =>
      this.apiCall(
        "/voice",
        HttpMethod.POST,
        { voiceModelName, text, pitch: pitch.toString() },
      ).then((response) => response.json()),
    );
  };

  /**
   * Generates audio from an audio URL.
   * @param voiceModelId - The ID of the voice model to use.
   * @param audioUrl - The URL of the audio file to use as input.
   * @param pitch - The pitch of the voice (optional).
   * @returns Promise with generation results.
   */
  generateFromAudioURL = async (
    voiceModelName: string,
    audioUrl: string,
    pitch: number = 0,
  ): Promise<{result: string}> => {
    return this.callWithHealthCheck(() =>
      this.apiCall(
        "/voice",
        HttpMethod.POST,
        { voiceModelName, audioUrl, pitch: pitch.toString() },
      ).then((response) => response.json()),
    );
  };

  /**
   * Generates a progressive image based on parameters.
   * @param params - Object containing query and optional loraName.
   * @param callback - Function to call with status updates.
   * @returns Promise with generation results.
   */
  generateProgressiveImage = async (
    params: GenerationParams,
    callback: (status: ImageStatus, data: GenerationResult) => unknown = (
      status: ImageStatus,
    ) => {
      return status;
    },
  ) => {
    await this.getHealthData();

    const { imageId } = await this.generateImage(params);
    const statusResponse = await this.getStatus({ imageId });
    const { status } = statusResponse;
    callback(status, { imageId });
    if (status === ImageStatus.COMPLETED) {
      return statusResponse;
    }
    let oldModifiedDate: string | null = null;
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

      if (status === ImageStatus.COMPLETED) {
        break;
      }

      if (status === ImageStatus.FAILED) {
        throw new Error("Image generation failed: " + error);
      }
    }
    return statusResponse;
  };
}
