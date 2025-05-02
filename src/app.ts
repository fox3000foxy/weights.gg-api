import "reflect-metadata";
import { InversifyExpressServer } from "inversify-express-utils";
import container from "./container";
import * as path from "path";
import * as fs from "fs";
import { TYPES } from "./types";
import { Config } from "./config";
import { IPuppeteerService } from "./services/puppeteerService";
import { IImageQueue, ISearchQueue } from "./services/queueService";
import { IImageProcessor } from "./processors/imageProcessor";
import { ILoraSearchProcessor } from "./processors/loraSearchProcessor";
import { Job } from "./types";
import { LoraSearchJob } from "./processors/loraSearchProcessor";
import express from "express";

import "./controllers/ImageController";
import "./controllers/LoraController";
import "./controllers/StatusController";
import "./controllers/HealthController";
import "./controllers/QuotaController";

const server = new InversifyExpressServer(container);

server.setConfig((app) => {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const config = container.get<Config>(TYPES.Config);
  app.use(express.static(path.join(__dirname, config.IMAGE_DIR)));

  if (!fs.existsSync(path.join(__dirname, config.IMAGE_DIR))) {
    fs.mkdirSync(path.join(__dirname, config.IMAGE_DIR));
    console.log(`Directory "${path.join(__dirname, config.IMAGE_DIR)}" created.`);
  }

  const puppeteerService = container.get<IPuppeteerService>(TYPES.PuppeteerService);
  const imageQueue = container.get<IImageQueue>(TYPES.ImageQueue);
  const loraSearchQueue = container.get<ISearchQueue>(TYPES.SearchQueue);
  const imageProcessor = container.get<IImageProcessor>(TYPES.ImageProcessor);
  const loraSearchProcessor = container.get<ILoraSearchProcessor>(TYPES.LoraSearchProcessor);

  const processImageJob = async (job: Job) => {
    const generationPage = await puppeteerService.getGenerationPageReady();
    await imageProcessor.processImage(job, generationPage);
  };

  const processLoraSearchJob = async (job: LoraSearchJob) => {
    const loraSearchPage = await puppeteerService.getLoraSearchPageReady();
    await loraSearchProcessor.processLoraSearch(job, loraSearchPage);
  };

  imageQueue.process(processImageJob);
  loraSearchQueue.process(processLoraSearchJob);
});

export const app = server.build();

// Only start the server if this file is run directly (not imported)
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });
}