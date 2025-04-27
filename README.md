- [Weights.gg Unofficial API](#weightsgg-unofficial-api)
    - [✨ Features](#-features)
    - [⚠️ Warning](#️-warning)
    - [🚀 Endpoints](#-endpoints)
        - [🩺 Health Check](#health-check)
        - [🔍 Search LoRAs](#search-loras)
        - [🎤 Search Audio Models](#search-audio-models)
        - [🚦 Image Status](#image-status)
        - [🖼️ Generate Image](#generate-image)
        - [💰 API Quota](#api-quota)
        - [🎤 Voice Generation](#-voice-generation)
    - [📖 Libraries](#-libraries)
    - [⚠️ DISCLAIMER – UNOFFICIAL API](#️-disclaimer--unofficial-api)
    - [❗ Compliance with Weights Terms of Service](#-compliance-with-weights-terms-of-service)
    - [🤝 Community-driven intent](#-community-driven-intent)

# Weights.gg Unofficial API

An automated image generation tool for Weights.gg, leveraging Puppeteer and an Express API to manage concurrent requests.

## ✨ Features

- **Concurrent Image Generation:** Queue system for handling multiple image requests.
- **API Key Authentication:** Secure endpoints.
- **Image Status Tracking:** Real-time status updates (STARTING, PENDING, COMPLETED, FAILED).
- **LoRA Support:** Add/remove LoRA models during generation.
- **Preview Updates:** See previews as your image generates.
- **Robust Error Handling:** Comprehensive error management and logging.
- **Health Check:** Monitor the bot's status with a dedicated endpoint.

## ⚠️ Warning

Generated images expire after 10 minutes. Download promptly!
## 🚀 Endpoints

### 🩺 Health Check

- `/health`: Checks server status.
    - **Method**: `GET`
    - **Response**:
        ```json
        {
          "status": "string"
        }
        ```

### 🔍 Search LoRAs

- `/search-loras`
    - **Method**: `GET`
    - **Query Parameter**:
        - `query` (required): URL-encoded search term.
    - **Response**: JSON array of LoRA objects:
        ```json
        [
          {
            "name": "string",
            "description": "string",
            "tags": ["string"],
            "image": "string"
          }
        ]
        ```

### 🎤 Search Audio Models

- `/search-voices-models`
    - **Method**: `GET`
    - **Query Parameter**:
        - `query` (required): URL-encoded search term.
    - **Response**: JSON array of AudioModel objects:
        ```json
        [
          {
            "id": "string",
            "title": "string",
            "content": "string",
            "image": "string"
          }
        ]
        ```

### 🚦 Image Status

- `/status/:imageId`
    - **Method**: `GET`
    - **Path Parameter**:
        - `imageId` (required): Image ID.
    - **Response**:
        ```json
        {
          "status": "PENDING | PROCESSING | COMPLETED | FAILED",
          "lastModifiedDate": "string",
          "error": "string"
        }
        ```

### 🖼️ Generate Image

- `/generateImage`
    - **Method**: `GET`
    - **Query Parameters**:
        - `prompt` (required): URL-encoded prompt.
        - `loraName` (optional): URL-encoded LoRA name.
    - **Response**:
        ```json
        {
          "imageId": "string"
        }
        ```

### 💰 API Quota

- `/quota`
    - **Method**: `GET`
    - **Response**: string

### 🎤 Voice Generation

- `/voice`
    - **Method**: `POST`
    - **Request Body**:
        ```json
        {
          "voiceModelName": "string",
          "text": "string",
          "audioUrl": "string",
          "pitch": "string",
          "male": "string"
        }
        ```
        - `voiceModelName` (required): The name of the voice model to use.
        - `text` (optional): The text to be converted to speech.
        - `audioUrl` (optional): The URL of the MP3 files that will be the converted audio source.
        - `pitch` (optional): The pitch of the converted voice, must be the string version of a number between -12 and 12.
        - `male` (optional): The default voice tone represented by a string version of a boolean. "true" is male, "false" is female.
        ⚠️ `text` OR `audioUrl` must be provided, but not both.
    - **Response**:
        ```json
        {
          "result": "string"
        }
        ```
    - **Example Usage (fetch)**:
        ```javascript
        const response = await fetch("YOUR_ENDPOINT/voice", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": "YOUR_API_KEY",
            },
            body: JSON.stringify({
                voiceModelName: "voice-model-name",
                text: "Hello world",
                pitch: "0",
                male: "true"
            }),
        });
        const {result} = await response.json();
        console.log(result);
        ```

## 📖 Libraries
- [TS](https://github.com/fox3000foxy/weights.gg-api/blob/main/src/libs/weights-api.ts), [JS](https://github.com/fox3000foxy/weights.gg-api/blob/main/dist/libs/weights-api.js) and [Python](https://github.com/fox3000foxy/weights.gg-api/blob/main/weights-api.py) libraries are now availiable!

> ⚠️ DISCLAIMER – UNOFFICIAL API

This repository documents an **unofficial API** for [weights.com](https://www.weights.com), based on public network traffic analysis. This project is **not affiliated with, endorsed by, or maintained by Weights or Paulson Court, Inc.**

The purpose of this documentation and wrapper is strictly **educational and experimental**. It is intended for **personal prototyping and testing only**. **No guarantee is given** regarding the availability, legality, or long-term stability of these endpoints.

## ❗ Compliance with Weights Terms of Service

As outlined in Weights’ Terms of Service ([weights.com/terms](https://www.weights.com/terms)), accessing the service using automated tools **other than those provided directly by Weights** is prohibited.

By using this repository, you agree to:

- **Not use this API for commercial purposes**.
- **Avoid mass scraping or abuse of the service**.
- **Comply with all Weights policies**, including those related to security, content, and intellectual property.
- **Migrate to the official API** as soon as it becomes publicly available.

📬 If Weights or an authorized representative requests takedown of this repository, it will be promptly removed.

## 🤝 Community-driven intent

This project was created to **help developers explore and interact with the platform responsibly** while the official API is under development.

For takedown requests or collaboration opportunities, please contact the repository maintainer or reach out to `support@weights.com`.
