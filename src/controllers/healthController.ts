import { controller, httpGet, interfaces } from "inversify-express-utils";
import { Request, Response } from "express";
import { inject } from "inversify";
import { TYPES } from "../types";
import { Config } from "../config";
import { apiKeyCheck } from "../middlewares/apiKeyCheck";

@controller("/health")
export class HealthController implements interfaces.Controller {
  constructor(@inject(TYPES.Config) private config: Config) {}

  @httpGet("/", apiKeyCheck)
  public async getHealth(req: Request, res: Response): Promise<void> {
    res.json({
      status: "OK",
    });
  }
}
