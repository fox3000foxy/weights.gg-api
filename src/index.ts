// filepath: /weights-selenium/weights-selenium/src/index.ts
import "reflect-metadata";
import * as fs from "fs";
import * as path from "path";
import { container, createApp } from "./inversify.config";
import { weightsConfig } from "./config";
import { TYPES } from "./types";
import { DirectApiService } from "./services/directApiService";

// Main function
async function main() {
  // Create the 'images' directory if it doesn't exist
  if (!fs.existsSync(path.join(__dirname, weightsConfig.IMAGE_DIR))) {
    fs.mkdirSync(path.join(__dirname, weightsConfig.IMAGE_DIR));
    console.log(
      `Directory "${path.join(__dirname, weightsConfig.IMAGE_DIR)}" created.`,
    );
  }

  // Initialize Puppeteer in DirectApiService
  const directApiService = container.get<DirectApiService>(
    TYPES.DirectApiService,
  );
  await directApiService.initPuppeteer();
  console.log("Puppeteer initialized.");

  const audioModels = await directApiService.createAudioJob("Bienvenue dans le centre de recherche", "clm72nzmc0d25cctcbk77n6i0");
  console.log("Audio Models:", audioModels);

  // Create and start the server
  const app = createApp();
  app.listen(weightsConfig.PORT, () => {
    console.log(`Server is running on port ${weightsConfig.PORT}`);
  });
}

main().catch(console.error);
