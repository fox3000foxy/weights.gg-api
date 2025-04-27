import "reflect-metadata";
import { Container } from "inversify";
import { InversifyExpressServer } from "inversify-express-utils";
import * as express from "express";
import * as path from "path";
import cors from "cors";

import { TYPES } from "./types";
import { Config, weightsConfig } from "./config";

// Services
import {
  DirectApiService,
  IDirectApiService,
} from "./services/directApiService";
import { IImageService, ImageService } from "./services/imageService";
import { IStatusService, StatusService } from "./services/statusService";
import { ILoraService, LoraService } from "./services/loraService";

// Controllers
import "./controllers/healthController";
import "./controllers/statusController";
import "./controllers/generateController";
import "./controllers/quotaController";
import "./controllers/searchController";

// Initialize Inversify container
export const container = new Container();

// Register services
const registerServices = () => {
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
};

// Configure server
const configureServer = (server: InversifyExpressServer) => {
  server.setConfig((app) => {
    app.use(express.json());
    app.use(cors());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, weightsConfig.IMAGE_DIR)));
  });
};

// Create and export the app
export const createApp = () => {
  registerServices();
  const server = new InversifyExpressServer(container);
  configureServer(server);
  return server.build();
};
