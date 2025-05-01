import "reflect-metadata";
import express, { Express } from "express";
import * as fs from "fs";
import * as path from "path";
import { injectable, inject } from "inversify";
import { TYPES } from "./types";
import setupRoutes from "./services/routes";
import { Job } from "./types";
import { LoraSearchJob } from "./processors/loraSearchProcessor";
import { Config } from "./config";
import { IPuppeteerService } from "./services/puppeteerService";
import { IImageQueue, ISearchQueue } from "./services/queueService";
import { IImageProcessor } from "./processors/imageProcessor";
import { IImageService } from "./services/imageService";
import { IStatusService } from "./services/statusService";
import { ILoraSearchProcessor } from "./processors/loraSearchProcessor";

@injectable()
class AppServer {
  private app: Express;

  constructor(
    @inject(TYPES.Config) private config: Config,
    @inject(TYPES.PuppeteerService) private puppeteerService: IPuppeteerService,
    @inject(TYPES.ImageQueue) private imageQueue: IImageQueue,
    @inject(TYPES.SearchQueue) private loraSearchQueue: ISearchQueue,
    @inject(TYPES.ImageProcessor) private imageProcessor: IImageProcessor,
    @inject(TYPES.LoraSearchProcessor) private loraSearchProcessor: ILoraSearchProcessor,
    @inject(TYPES.ImageService) private imageService: IImageService,
    @inject(TYPES.StatusService) private statusService: IStatusService
  ) {
    this.app = express();
    this.setupMiddleware();
  }

  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.static(path.join(__dirname, this.config.IMAGE_DIR)));
  }

  private processImageJob = async (job: Job) => {
    const generationPage = await this.puppeteerService.getGenerationPageReady();
    await this.imageProcessor.processImage(job, generationPage);
  };

  private processLoraSearchJob = async (job: LoraSearchJob) => {
    const loraSearchPage = await this.puppeteerService.getLoraSearchPageReady();
    await this.loraSearchProcessor.processLoraSearch(job, loraSearchPage);
  };

  public async start() {
    if (!fs.existsSync(path.join(__dirname, this.config.IMAGE_DIR))) {
      fs.mkdirSync(path.join(__dirname, this.config.IMAGE_DIR));
      console.log(
        `Directory "${path.join(__dirname, this.config.IMAGE_DIR)}" created.`
      );
    }

    const emitter = this.puppeteerService.emitter;

    this.imageQueue.process(this.processImageJob);
    this.loraSearchQueue.process(this.processLoraSearchJob);

    setupRoutes(
      this.app,
      this.config,
      this.puppeteerService,
      this.imageService,
      this.statusService,
      this.imageQueue,
      this.loraSearchQueue,
      emitter
    );

    this.app.listen(this.config.PORT, () => {
      console.log(`Server is running on port ${this.config.PORT}`);
    });
  }
}

import container from "./container";
const server = container.resolve(AppServer);
server.start().catch(console.error);
