import { controller, httpGet, interfaces } from "inversify-express-utils";
import { Request, Response } from "express";
import { inject } from "inversify";
import { TYPES } from "../types";
import { Config } from "../config";
import StatusService from "../services/statusService";
import { apiKeyCheck } from "../middlewares/apiKeyCheck";

@controller("/status")
export class StatusController implements interfaces.Controller {
  constructor(
    @inject(TYPES.Config) private config: Config,
    @inject(TYPES.StatusService) private statusService: StatusService,
  ) {}

  @httpGet("/:imageId", apiKeyCheck)
  public async getHealth(req: Request, res: Response): Promise<void> {
    const { imageId } = req.params;
    const status = this.statusService.getImageStatus(imageId);
    res.send(status);
  }
}
