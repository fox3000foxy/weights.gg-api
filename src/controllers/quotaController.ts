import { controller, httpGet, interfaces } from "inversify-express-utils";
import { Request, Response } from "express";
import { inject } from "inversify";
import { TYPES } from "../types";
import { DirectApiService } from "../services/directApiService";
import { apiKeyCheck } from "../middlewares/apiKeyCheck";

@controller("/quota")
export class QuotaController implements interfaces.Controller {
  constructor(
    @inject(TYPES.DirectApiService) private directServiceApi: DirectApiService,
  ) {}

  @httpGet("/", apiKeyCheck)
  public async getQuotas(_req: Request, res: Response): Promise<void> {
    try {
      const quota = await this.directServiceApi.getQuotas();
      res.send(quota);
    } catch (error) {
      console.error("Error in getQuotas:", error);
      res.status(500).send({ error: "An unexpected error occurred." });
    }
  }
}
