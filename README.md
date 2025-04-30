- [Weights.gg Unofficial API](#weightsgg-unofficial-api)
    - [✨ Features](#-features)
    - [⚠️ Warning](#%EF%B8%8F-warning)
    - [🚀 Endpoints](#-endpoints)
        - [🩺 Health Check](#health-check)
        - [🔍 Search LoRAs](#search-loras)
        - [🚦 Image Status](#image-status)
        - [🖼️ Generate Image](#generate-image)
        - [💰 API Quota](#api-quota)
    - [📖 Libraries](#-libraries)
    - [⚠️ Compliance with Weights Terms of Service](#-compliance-with-weights-terms-of-service)
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

### 🔍 Search LoRAs

- `/search-loras`
    - **Query Parameter**:
        - `query` (required): URL-encoded search term.
    - **Response**: JSON array of LoRA objects:
        - `name`: LoRA name.
        - `image`: LoRA image URL.
        - `tags`: Array of tags.

### 🚦 Image Status

- `/status/:imageId`
    - **Path Parameter**:
        - `imageId` (required): Image ID.
    - **Response**:
        - `status`: (QUEUED, STARTING, PENDING, COMPLETED, FAILED, NOT_FOUND).
        - `prompt`: Generation prompt.
        - `startTime`: Start time.
        - `lastModifiedDate`: Last status update.
        - `error`: Error message (if applicable).

### 🖼️ Generate Image

- `/generateImage`
    - **Query Parameters**:
        - `prompt` (required): URL-encoded prompt.
        - `loraName` (optional): URL-encoded LoRA name.
    - **Response**:
        - `success`: Boolean.
        - `imageId`: Unique ID.
        - `imageUrl`: Image URL.
        - `statusUrl`: Status check URL.

### 💰 API Quota

- `/quota`: Retrieves API quota information.
    - **Response**: Plain text quota details.

## 📖 Libraries
- [TS](https://github.com/fox3000foxy/weights.gg-api/blob/main/libs/weights-api.ts), [JS](https://github.com/fox3000foxy/weights.gg-api/blob/main/libs/weights-api.js), and [Python](https://github.com/fox3000foxy/weights.gg-api/blob/main/libs/weights_api.py) libraries are availiable too. Please use them for easy access to the unofficial Weights.gg API.
- For installing the Python module in your env, simply navigate to `libs` and use `pip install .` to install it.

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
