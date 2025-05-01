import { Container } from "inversify";
import { TYPES } from "./types";
import config from "./config";
import { ImageService, IImageService } from "./services/imageService";
import { ImageProcessor, IImageProcessor } from "./processors/imageProcessor";
import PuppeteerService, { IPuppeteerService } from "./services/puppeteerService";
import LoraService, { ILoraService } from "./services/loraService";
import StatusService, { IStatusService } from "./services/statusService";
import { ImageQueue, SearchQueue, IImageQueue, ISearchQueue } from "./services/queueService";
import LoraSearchProcessor, { ILoraSearchProcessor } from "./processors/loraSearchProcessor";

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
container.bind<ILoraSearchProcessor>(TYPES.LoraSearchProcessor).toDynamicValue(ctx =>
    new LoraSearchProcessor(ctx.container.get(TYPES.LoraService))
).inSingletonScope();
export default container;