# Weights.gg Unofficial API

This bot automates image generation on Weights.gg using Puppeteer. It manages a queue system to handle concurrent image generation requests via an Express API.

## Features

-   **Concurrent Image Generation:** Manages a queue system to handle simultaneous image generation requests.
-   **API Key Authentication:** Secures API endpoints with API key authentication.
-   **Image Status Tracking:** Tracks the status of each image generation job (STARTING, PENDING, COMPLETED, FAILED).
-   **Lora Addition/Removal:** Allows adding and removing LoRA models during image generation.
-   **Preview Updates:** Provides image preview updates during the generation process.
-   **Error Handling:** Implements robust error handling and logging.
-   **Health Check:** Provides a health check endpoint to monitor the bot's status.

## Endpoints

-   `/health`: Checks if the server is running.
-   `/status/:imageId`: Retrieves the status of a specific image generation job.
    -   **Path Parameters**:
        -   `imageId` (required): The ID of the image to retrieve the status for.
    -   **Response**:
        -   `status`: The status of the image generation job (STARTING, PENDING, COMPLETED, FAILED, NOT_FOUND).
        -   `prompt`: The prompt used to generate the image.
        -   `startTime`: The time the image generation job started.
        -   `lastModifiedDate`: The last time the image status was modified.
        -   `error`: Error message if the image generation job failed.
-   `/generateImage`: Generates an image based on the provided prompt.
    -   **Query Parameters**:
        -   `prompt` (required): The prompt to use for image generation (URL encoded).
        -   `loraName` (optional): The name of the LoRA to add to the image generation (URL encoded).
    -   **Response**:
        -   `success`: Boolean indicating if the image generation job was started successfully.
        -   `imageId`: Unique identifier for the image generation job.
        -   `imageUrl`: URL of the generated image.
        -   `statusUrl`: URL to check the status of the image generation job.

