import { inject } from "inversify";
import { controller, httpGet, response, request } from "inversify-express-utils";
import { ISearchQueue } from "../services/queueService";
import { IImageService } from "../services/imageService";
import { TYPES } from "../types";
import { Request, Response } from "express";
import { ILoraService } from "services/loraService";
import * as yup from "yup";

const searchLoraQuerySchema = yup.object({
  query: yup.string().required("Query parameter is required."),
});

@controller("/search-loras")
export class LoraController {
  constructor(
    @inject(TYPES.SearchQueue) private loraSearchQueue: ISearchQueue,
    @inject(TYPES.ImageService) private imageService: IImageService,
    @inject(TYPES.LoraService) private loraService: ILoraService
  ) {}

  @httpGet("/")
  public async searchLora(@request() req: Request, @response() res: Response) {
    try {
      await searchLoraQuerySchema.validate(req.query, { abortEarly: false, stripUnknown: true });
    } catch (err: any) {
      return res.status(400).json({ error: "Validation error", details: err.errors });
    }

    const { query } = req.query as { query: string };

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
