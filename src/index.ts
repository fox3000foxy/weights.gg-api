// filepath: /weights-selenium/weights-selenium/src/index.ts
import "reflect-metadata";
import * as fs from "fs";
import * as path from "path";
import { container, createApp } from "./inversify.config";
import { weightsConfig } from "./config";
import { TYPES } from "./types";
import { DirectApiService } from "./services/directApiService";

// Ensure the 'images' directory exists
const ensureDirectoryExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
    console.log(`Directory "${dirPath}" created.`);
  }
};

// Main function
async function main() {
  try {
    const imagesDir = path.join(__dirname, weightsConfig.IMAGE_DIR);
    ensureDirectoryExists(imagesDir);

    // Initialize Puppeteer in DirectApiService
    const directApiService = container.get<DirectApiService>(
      TYPES.DirectApiService,
    );
    await directApiService.initPuppeteer();
    console.log("Puppeteer initialized.");

    // Create and start the server
    const app = createApp();
    app.listen(weightsConfig.PORT, () => {
      console.log(`Server is running on port ${weightsConfig.PORT}`);
    });
  } catch (error) {
    console.error("Error during application startup:", error);
  }
}

main();
