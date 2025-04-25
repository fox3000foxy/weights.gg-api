import "reflect-metadata";
import { Container } from "inversify";
import { InversifyExpressServer } from "inversify-express-utils";
import * as express from "express";
import * as path from "path";
import cors from "cors";

import { TYPES } from "./types";
import { Config, weightsConfig } from "./config";
import {
  DirectApiService,
  IDirectApiService,
} from "./services/directApiService";
import { IImageService, ImageService } from "./services/imageService";
import { IStatusService, StatusService } from "./services/statusService";
import { ILoraService, LoraService } from "./services/loraService";

// Import controllers
import "./controllers/healthController";
import "./controllers/statusController";
import "./controllers/generateController";
import "./controllers/quotaController";
import "./controllers/searchController";
import "./controllers/voiceController";

export const container = new Container();

// Register services
container.bind<Config>(TYPES.Config).toConstantValue(weightsConfig);
container
  .bind<IStatusService>(TYPES.StatusService)
  .to(StatusService)
  .inSingletonScope();
container
  .bind<IImageService>(TYPES.ImageService)
  .to(ImageService)
  .inSingletonScope();
container
  .bind<IDirectApiService>(TYPES.DirectApiService)
  .to(DirectApiService)
  .inSingletonScope();
container
  .bind<ILoraService>(TYPES.LoraService)
  .to(LoraService)
  .inSingletonScope();

// Create server
const server = new InversifyExpressServer(container);

server.setConfig((app) => {
  app.use(express.json());
  app.use(cors());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, weightsConfig.IMAGE_DIR)));
});

export const createApp = () => {
  const app = server.build();
  return app;
};
