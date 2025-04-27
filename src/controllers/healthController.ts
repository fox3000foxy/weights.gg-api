import { controller, httpGet, interfaces } from "inversify-express-utils";
import { Request, Response } from "express";
import { apiKeyCheck } from "../middlewares/apiKeyCheck";

@controller("/health")
export class HealthController implements interfaces.Controller {
  @httpGet("/", apiKeyCheck)
  public async getHealth(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        status: "OK",
      });
    } catch (error) {
      console.error("Error in getHealth:", error);
      res.status(500).send({ error: "An unexpected error occurred." });
    }
  }
}
