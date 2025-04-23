import { Express } from "express";
import { EventEmitter } from "events";
import { Config } from "../config";
import { PuppeteerService } from "./puppeteerService";
import { ImageService } from "./imageService";
import { StatusService } from "./statusService";
import { ImageQueue, SearchQueue } from "./queueService";
export declare const setupRoutes: (app: Express, config: Config, puppeteerService: PuppeteerService, imageService: ImageService, statusService: StatusService, imageQueue: ImageQueue, loraSearchQueue: SearchQueue, events: EventEmitter) => void;
export default setupRoutes;
