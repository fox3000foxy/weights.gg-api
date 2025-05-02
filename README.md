# Weights.gg Unofficial API

An automated image generation tool for Weights.gg, leveraging Puppeteer and an Express API to manage concurrent requests.

---

## 📚 Table of Contents

| Section | Description |
|---------|-------------|
| [✨ Features](#-features) | Key capabilities of the API |
| [⚠️ Warning](#-warning) | Important usage notes |
| [🚀 Endpoints](#-endpoints) | API endpoints and usage |
| [📦 Dev Packages](#-dev-packages) | Development dependencies |
| [📖 Libraries](#-libraries) | Client libraries for integration |
| [❗ Compliance](#-compliance-with-weights-terms-of-service) | Terms of Service and usage rules |
| [🤝 Community](#-community-driven-intent) | Project intent and contact |

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Concurrent Image Generation** | Queue system for handling multiple image requests |
| **API Key Authentication** | Secure endpoints |
| **Image Status Tracking** | Real-time status updates (STARTING, PENDING, COMPLETED, FAILED) |
| **LoRA Support** | Add/remove LoRA models during generation |
| **Preview Updates** | See previews as your image generates |
| **Robust Error Handling** | Comprehensive error management and logging |
| **Health Check** | Monitor the bot's status with a dedicated endpoint |

---

## ⚠️ Warning

> **Generated images expire after 10 minutes. Download promptly!**

---

## 🚀 Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Checks server status |
| `/search-loras?query=...` | GET | Search for LoRA models by name or tag |
| `/status/:imageId` | GET | Get status and details for a generated image |
| `/generateImage?prompt=...&loraName=...` | POST | Generate a new image with optional LoRA |
| `/quota` | GET | Retrieve API quota information |

<details>
<summary>Endpoint Details</summary>

### `/search-loras`
- **Query Parameter**: `query` (required) — URL-encoded search term
- **Response**: JSON array of LoRA objects (`name`, `image`, `tags`)

### `/status/:imageId`
- **Path Parameter**: `imageId` (required)
- **Response**: `status`, `prompt`, `startTime`, `lastModifiedDate`, `error`

### `/generateImage`
- **Query Parameters**: `prompt` (required), `loraName` (optional)
- **Response**: `success`, `imageId`, `imageUrl`, `statusUrl`
</details>

---

## 📦 Dev Packages

| Package | Purpose | Link |
|---------|---------|------|
| **eslint** | Code linting and style enforcement | [eslint](https://eslint.org/) |
| **prettier** | Code formatting | [prettier](https://prettier.io/) |
| **jest** | JavaScript/TypeScript testing framework | [jest](https://jestjs.io/) |
| **yup** | Schema validation for request data | [yup](https://github.com/jquense/yup) |
| **puppeteer** | Headless browser automation for image generation | [puppeteer](https://pptr.dev/) |
| **puppeteer-real-browser** | Enhanced Puppeteer browser emulation | [puppeteer-real-browser](https://github.com/berstend/puppeteer-real-browser) |
| **rebrowser-puppeteer-core** | Puppeteer core for real browser automation | [rebrowser-puppeteer-core](https://www.npmjs.com/package/rebrowser-puppeteer-core) |
| **express** | Web server for API endpoints | [express](https://expressjs.com/) |
| **inversify** | Dependency injection for TypeScript | [inversify](https://inversify.io/) |
| **inversify-express-utils** | Express integration for Inversify | [inversify-express-utils](https://github.com/inversify/inversify-express-utils) |
| **sharp** | High-performance image processing | [sharp](https://sharp.pixelplumbing.com/) |
| **dotenv** | Environment variable management | [dotenv](https://github.com/motdotla/dotenv) |
| **supertest** | HTTP assertions for testing Express APIs | [supertest](https://github.com/ladjs/supertest) |
| **typescript** | TypeScript language support | [typescript](https://www.typescriptlang.org/) |
| **ts-node** | TypeScript execution environment | [ts-node](https://typestrong.org/ts-node/) |

## 📖 Libraries

| Language | Library | Install / Usage |
|----------|---------|-----------------|
| TypeScript | [`libs/weights-api.ts`](libs/weights-api.ts) | Import directly in your TS project |
| JavaScript | [`libs/weights-api.js`](libs/weights-api.js) | Import directly in your JS project |
| Python | [`libs/weights_api.py`](libs/weights_api.py) | `cd libs && pip install .` |

---

> ⚠️ **DISCLAIMER – UNOFFICIAL API**  
> This repository documents an **unofficial API** for [weights.com](https://www.weights.com), based on public network traffic analysis.  
> This project is **not affiliated with, endorsed by, or maintained by Weights or Paulson Court, Inc.**  
> Intended for **educational and experimental** use only. No guarantee is given regarding the availability, legality, or long-term stability of these endpoints.

---

## ❗ Compliance with Weights Terms of Service

As outlined in Weights’ Terms of Service ([weights.com/terms](https://www.weights.com/terms)), accessing the service using automated tools **other than those provided directly by Weights** is prohibited.

By using this repository, you agree to:

- **Not use this API for commercial purposes**
- **Avoid mass scraping or abuse of the service**
- **Comply with all Weights policies**, including those related to security, content, and intellectual property
- **Migrate to the official API** as soon as it becomes publicly available

📬 If Weights or an authorized representative requests takedown of this repository, it will be promptly removed.

---

## 🤝 Community-driven intent

This project was created to **help developers explore and interact with the platform responsibly** while the official API is under development.

For takedown requests or collaboration opportunities, please contact the repository maintainer or reach out to `support@weights.com`.
