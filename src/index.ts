// filepath: /weights-selenium/weights-selenium/src/index.ts
import express from "express";
import * as fs from "fs";
import * as path from "path";

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
import { ImageGenerationResult, Job } from "./types";

declare global {
  interface Window {
    handlePreviewUpdate: (data: ImageGenerationResult) => void;
  }
}

// --- Services Initialization ---
const imageService = new ImageService(config);
const loraService = new LoraService(config);
const statusService = new StatusService();
const puppeteerService = new PuppeteerService(imageService, statusService);

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
// On récupère la page à la demande, juste avant le traitement
const processImageJob = async (job: Job) => {
  const generationPage = await puppeteerService.getGenerationPageReady();
  await imageProcessor.processImage(job, generationPage);
};

const processLoraSearchJob = async (job: LoraSearchJob) => {
  const loraSearchPage = await puppeteerService.getLoraSearchPageReady();
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

  // Plus besoin d'initialiser puppeteerService ici

  const emitter = puppeteerService.emitter;

  // Les pages sont récupérées à la demande dans les jobs, donc plus besoin de vérifier ici

  imageQueue.process(processImageJob);
  loraSearchQueue.process(processLoraSearchJob);

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
