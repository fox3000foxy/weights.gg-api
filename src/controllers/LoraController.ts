import { inject } from "inversify";
import { controller, httpGet, response, request } from "inversify-express-utils";
import { ISearchQueue } from "../services/queueService";
import { IImageService } from "../services/imageService";
import { TYPES } from "../types";
import { Request, Response } from "express";
import { ILoraService } from "services/loraService";

@controller("/search-loras")
export class LoraController {
  constructor(
    @inject(TYPES.SearchQueue) private loraSearchQueue: ISearchQueue,
    @inject(TYPES.ImageService) private imageService: IImageService,
    @inject(TYPES.LoraService) private loraService: ILoraService
  ) {}

  @httpGet("/")
  public async searchLora(@request() req: Request, @response() res: Response) {
    const { query } = req.query;
    if (!query || typeof query !== "string") {
      res.status(400).send({ error: "Query parameter is required." });
      return;
    }
    
    if (this.loraService.loraSearchCache.has(query)) {
        console.log(`Using cached result for Lora search: ${query}`);
        const cachedResult = this.loraService.loraSearchCache.get(query);
        res.send(cachedResult);
        return;
      }
    const loraName = decodeURIComponent(query);
    const searchId = this.imageService.generateImageId();
    this.loraSearchQueue.enqueue({
      job: { query: loraName, res },
      id: searchId,
      data: { query: loraName },
    });
  }
}
