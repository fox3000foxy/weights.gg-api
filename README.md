# Weights.gg Unofficial API

This bot automates image generation on Weights.gg using Puppeteer. It manages multiple browser instances to handle concurrent image generation requests via an Express API.

## Features

-   **Concurrent Image Generation:** Manages multiple Puppeteer browser instances to handle simultaneous image generation requests.
-   **API Key Authentication:** Secures API endpoints with API key authentication.
-   **Image Status Tracking:** Tracks the status of each image generation job (STARTING, PENDING, COMPLETED, FAILED).
-   **Lora Addition/Removal:** Allows adding and removing LoRA models during image generation.
-   **Space Allocation:** Manages browser "spaces" to ensure that LoRAs and prompts are tied to a specific browser instance. Actually WIP.
-   **Preview Updates:** Provides image preview updates during the generation process.
-   **Error Handling:** Implements robust error handling and logging.
-   **Health Check:** Provides a health check endpoint to monitor the bot's status.

## Endpoints

-   `/health`: Checks if the server is running.
-   `/allocateSpace`: Allocates a browser instance and returns a space ID.
    -   **Response**:
        -   `success`: Boolean indicating if the space was allocated successfully.
        -   `spaceId`: Unique identifier for the allocated space.
-   `/addLora`: Adds a LoRA model to a specific browser instance.
    -   **Query Parameters**:
        -   `loraName` (required): Name of the LoRA model to add (URL encoded).
        -   `spaceId` (required): The space ID to add the LoRA to.
    -   **Response**:
        -   `success`: Boolean indicating if the LoRA was added successfully.
-   `/removeLora`: Removes a LoRA model from a specific browser instance.
    -   **Query Parameters**:
        -   `spaceId` (required): The space ID to remove the LoRA from.
    -   **Response**:
        -   `success`: Boolean indicating if the LoRA was removed successfully.
-   `/status/:imageId`: Retrieves the status of a specific image generation job.
    -   **Path Parameters**:
        -   `imageId` (required): The ID of the image to retrieve the status for.
    -   **Response**:
        -   `status`: The status of the image generation job (STARTING, PENDING, COMPLETED, FAILED, NOT_FOUND).
        -   `prompt`: The prompt used to generate the image.
        -   `startTime`: The time the image generation job started.
        -   `lastModifiedDate`: The last time the image status was modified.
        -   `spaceId`: The space ID the image generation job is running in.
        -   `error`: Error message if the image generation job failed.
-   `/generateImageJob`: Generates an image based on the provided prompt and space ID.
    -   **Query Parameters**:
        -   `prompt` (required): The prompt to use for image generation (URL encoded).
        -   `spaceId` (required): The space ID to use for image generation.
    -   **Response**:
        -   `success`: Boolean indicating if the image generation job was started successfully.
        -   `imageId`: Unique identifier for the image generation job.
        -   `imageUrl`: URL of the generated image.
        -   `statusUrl`: URL to check the status of the image generation job.
        -   `spaceId`: The space ID the image generation job is running in.

