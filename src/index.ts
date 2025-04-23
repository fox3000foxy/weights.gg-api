// filepath: /weights-selenium/weights-selenium/src/index.ts
import express from "express";
import * as events from "events";
import * as fs from "fs";
import * as path from "path";
import { Page } from "rebrowser-puppeteer-core";

import config from "./config";
import PuppeteerService from "./services/puppeteerService";
import { ImageQueue, SearchQueue } from "./services/queueService";
import ImageService from "./services/imageService";
import LoraService from "./services/loraService";
import StatusService from "./services/statusService";
import setupRoutes from "./services/routes";
import ImageProcessor from "./processors/imageProcessor";
import LoraSearchProcessor, {
  LoraSearchJob,
} from "./processors/loraSearchProcessor";
import { PreviewHandler } from "./handlers/previewHandler";
import { EVENT_TYPES, ImageGenerationResult, Job } from "./types";

declare global {
  interface Window {
    handlePreviewUpdate: (data: ImageGenerationResult) => void;
  }
}

// --- Services Initialization ---
const puppeteerService = new PuppeteerService();
const imageService = new ImageService(config);
const loraService = new LoraService(config);
const statusService = new StatusService();

// --- Queue Initialization ---
const imageQueue = new ImageQueue(config.MAX_QUEUE_SIZE);
const loraSearchQueue = new SearchQueue();

// --- Express App ---
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, config.IMAGE_DIR)));

// --- Services ---
const imageProcessor = new ImageProcessor(
  puppeteerService,
  imageService,
  loraService,
  statusService,
  config,
  imageQueue,
);
const loraSearchProcessor = new LoraSearchProcessor(loraService);

// --- Queue Processors ---
const processImageJob = async (job: Job, generationPage: Page) => {
  await imageProcessor.processImage(job, generationPage);
};

const processLoraSearchJob = async (
  job: LoraSearchJob,
  loraSearchPage: Page,
) => {
  await loraSearchProcessor.processLoraSearch(job, loraSearchPage);
};

// --- Main Function ---
async function main() {
  // Create the 'images' directory if it doesn't exist
  if (!fs.existsSync(path.join(__dirname, config.IMAGE_DIR))) {
    fs.mkdirSync(path.join(__dirname, config.IMAGE_DIR));
    console.log(
      `Directory "${path.join(__dirname, config.IMAGE_DIR)}" created.`,
    );
  }

  await puppeteerService.initialize();
  await Promise.all([
    puppeteerService.onStart(
      puppeteerService.generationPage as Page,
      config.WEIGHTS_GG_COOKIE,
    ),
    puppeteerService.onStart(
      puppeteerService.loraSearchPage as Page,
      config.WEIGHTS_GG_COOKIE,
    ),
  ]);

  const emitter = new events.EventEmitter();

  // Add event listeners
  emitter.on(EVENT_TYPES.PREVIEW_UPDATE, (data) => {
    return data;
  });

  emitter.on(EVENT_TYPES.STATUS_UPDATE, (data) => {
    statusService.updateImageStatus(data.imageId, data.status, data.error);
  });

  const previewHandler = new PreviewHandler(
    imageService,
    statusService,
    emitter,
  );

  if (!puppeteerService.generationPage) return;
  if (!puppeteerService.loraSearchPage) return;

  // Expose the function directly without debounce
  await puppeteerService.generationPage.exposeFunction(
    "handlePreviewUpdate",
    (data: ImageGenerationResult) => previewHandler.handlePreviewUpdate(data),
  );

  // Setup the event listener in the browser context
  await puppeteerService.generationPage.evaluate(() => {
    window.addEventListener("previewUpdate", (event: Event) => {
      window.handlePreviewUpdate((event as CustomEvent).detail);
    });
  });

  imageQueue.process(processImageJob, puppeteerService.generationPage);
  loraSearchQueue.process(
    processLoraSearchJob,
    puppeteerService.loraSearchPage,
  );

  setupRoutes(
    app,
    config,
    puppeteerService,
    imageService,
    statusService,
    imageQueue,
    loraSearchQueue,
    emitter,
  );

  app.listen(config.PORT, () => {
    console.log(`Server is running on port ${config.PORT}`);
  });
}

main().catch(console.error);
