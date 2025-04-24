// filepath: /weights-selenium/weights-selenium/src/index.ts
import express from "express";
import * as fs from "fs";
import * as path from "path";

import config from "./config";
import ImageService from "./services/imageService";
import StatusService from "./services/statusService";
import setupRoutes from "./services/routes";
import DirectApiService from "./services/directApiService";
import LoraService from "./services/loraService";

// --- Services Initialization ---
const imageService = new ImageService(config);
const statusService = new StatusService();
const directApiService = new DirectApiService(
  config.WEIGHTS_GG_COOKIE,
  statusService,
  imageService
)
const loraService = new LoraService(config, directApiService);


// --- Express App ---
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, config.IMAGE_DIR)));


// --- Main Function ---
async function main() {
  // Create the 'images' directory if it doesn't exist
  if (!fs.existsSync(path.join(__dirname, config.IMAGE_DIR))) {
    fs.mkdirSync(path.join(__dirname, config.IMAGE_DIR));
    console.log(
      `Directory "${path.join(__dirname, config.IMAGE_DIR)}" created.`,
    );
  }

  await directApiService.initPuppeteer()

  setupRoutes(
    app,
    config,
    loraService,
    statusService,
    imageService,
    directApiService,
  );

  app.listen(config.PORT, () => {
    console.log(`Server is running on port ${config.PORT}`);
  });
}

main().catch(console.error);
