import { controller, httpGet, interfaces } from "inversify-express-utils";
import { Request, Response } from "express";
import { inject } from "inversify";
import { TYPES } from "../types";
import { Config } from "../config";
import { DirectApiService } from "../services/directApiService";
import { apiKeyCheck } from "../middlewares/apiKeyCheck";

@controller("/quota")
export class QuotaController implements interfaces.Controller {
  constructor(
    @inject(TYPES.Config) private config: Config,
    @inject(TYPES.DirectApiService) private directServiceApi: DirectApiService,
  ) {}

  @httpGet("/", apiKeyCheck)
  public async getQuotas(_req: Request, res: Response): Promise<void> {
    const quota = await this.directServiceApi.getQuotas();
    res.send(quota);
  }
}
