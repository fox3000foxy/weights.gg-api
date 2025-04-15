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
-   `/addLora`: Adds a LoRA model to a specific browser instance.
-   `/removeLora`: Removes a LoRA model from a specific browser instance.
-   `/status/:imageId`: Retrieves the status of a specific image generation job.
-   `/generateImageJob`: Generates an image based on the provided prompt and space ID.