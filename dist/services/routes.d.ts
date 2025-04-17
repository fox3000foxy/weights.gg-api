import { Express } from 'express';
import { EventEmitter } from 'events';
import { Config } from '../config';
import { PuppeteerService } from './puppeteerService';
import { ImageService } from './imageService';
import { StatusService } from './statusService';
import { Queue } from './queueService';
export declare const setupRoutes: (app: Express, config: Config, puppeteerService: PuppeteerService, imageService: ImageService, statusService: StatusService, imageQueue: Queue, loraSearchQueue: Queue, events: EventEmitter) => void;
export default setupRoutes;
