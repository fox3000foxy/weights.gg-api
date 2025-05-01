import { Container } from "inversify";

import config from "./config";
import { TYPES } from "./types";

import { IImageService, ImageService } from "./services/imageService";
import { IPuppeteerService, PuppeteerService } from "./services/puppeteerService";
import LoraService, { ILoraService } from "./services/loraService";
import StatusService, { IStatusService } from "./services/statusService";
import { IImageQueue, ISearchQueue, ImageQueue, SearchQueue } from "./services/queueService";
import { IImageProcessor, ImageProcessor } from "./processors/imageProcessor";
import { ILoraSearchProcessor, LoraSearchProcessor } from "./processors/loraSearchProcessor";

const container = new Container();

container.bind(TYPES.Config).toConstantValue(config);
container.bind<IImageService>(TYPES.ImageService).to(ImageService).inSingletonScope();
container.bind<ILoraService>(TYPES.LoraService).to(LoraService).inSingletonScope();
container.bind<IStatusService>(TYPES.StatusService).to(StatusService).inSingletonScope();
container.bind<IPuppeteerService>(TYPES.PuppeteerService).toDynamicValue(ctx =>
    new PuppeteerService(
        ctx.container.get(TYPES.ImageService),
        ctx.container.get(TYPES.StatusService)
    )
).inSingletonScope();
container.bind<IImageQueue>(TYPES.ImageQueue).toDynamicValue(() =>
    new ImageQueue(config.MAX_QUEUE_SIZE)
).inSingletonScope();
container.bind<ISearchQueue>(TYPES.SearchQueue).toDynamicValue(() =>
    new SearchQueue(config.MAX_QUEUE_SIZE)
).inSingletonScope();
container.bind<IImageProcessor>(TYPES.ImageProcessor).to(ImageProcessor).inSingletonScope();
container.bind<ILoraSearchProcessor>(TYPES.LoraSearchProcessor).to(LoraSearchProcessor).inSingletonScope();
// container.bind<IPuppeteerService>(TYPES.PuppeteerService).to(PuppeteerService).inSingletonScope();
export default container;