import { controller, httpGet, interfaces } from "inversify-express-utils";
import { Request, Response } from "express";
import { inject } from "inversify";
import { TYPES } from "../types";
import StatusService from "../services/statusService";
import { apiKeyCheck } from "../middlewares/apiKeyCheck";

@controller("/status")
export class StatusController implements interfaces.Controller {
  constructor(
    @inject(TYPES.StatusService) private statusService: StatusService,
  ) {}

  @httpGet("/:imageId", apiKeyCheck)
  public async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const { imageId } = req.params;
      const status = await this.statusService.getImageStatus(imageId);
      res.send(status);
    } catch (error) {
      console.error("Error in getHealth:", error);
      res.status(500).send({ error: "An unexpected error occurred." });
    }
  }
}
