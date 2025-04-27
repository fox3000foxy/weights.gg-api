import { controller, httpGet, interfaces } from "inversify-express-utils";
import { Request, Response } from "express";
import { inject } from "inversify";
import { TYPES } from "../types";
import { apiKeyCheck } from "../middlewares/apiKeyCheck";
import LoraService from "../services/loraService";

@controller("/search-loras")
export class SearchLoraController implements interfaces.Controller {
  constructor(
    @inject(TYPES.LoraService) private loraService: LoraService,
  ) {}

  @httpGet("/", apiKeyCheck)
  async searchLoras(req: Request, res: Response) {
    const { query } = req.query;
    if (!query || typeof query !== "string") {
      res.status(400).send({
        error: "Query parameter is required.",
      });
      return;
    }

    const loras = await this.loraService.searchLoras(query);
    res.send(loras);
  };
}

@controller("/search-voices-models")
export class SearchVoiceModelController implements interfaces.Controller {
  constructor(
    @inject(TYPES.LoraService) private loraService: LoraService,
  ) {}

  @httpGet("/", apiKeyCheck)
  async searchVoiceModels(req: Request, res: Response) {
    const { query } = req.query;
    if (!query || typeof query !== "string") {
      res.status(400).send({
        error: "Query parameter is required.",
      });
      return;
    }

    const voiceModels = await this.loraService.searchVoiceModels(query);
    res.send(voiceModels);
  };
}
