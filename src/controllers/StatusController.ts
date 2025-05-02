import { Request, Response, NextFunction } from "express";
import { inject } from "inversify";
import { controller, httpGet, request, response, next } from "inversify-express-utils";
import { TYPES } from "../types";
import { IStatusService } from "../services/statusService";
import * as yup from "yup";
import { checkApiKey } from "../middlewares/checkApiKey";

const statusQuerySchema = yup.object({
  imageId: yup.string().required("imageId is required"),
});

@controller("/status")
export class StatusController {
    constructor(
        @inject(TYPES.StatusService) private statusService: IStatusService,
    ) {}

    @httpGet("/:imageId", checkApiKey)
    public async getImageStatus(
      @request() req: Request,
      @response() res: Response,
      @next() next: NextFunction
    ) {
        try {
          await statusQuerySchema.validate(req.params, { abortEarly: false });
        } catch (err: any) {
          return res.status(400).json({ error: "Validation error", details: err.errors });
        }
        const { imageId } = req.params;
        const status = this.statusService.getImageStatus(imageId);
        if (!status) {
          return res.status(404).json({ error: "Image not found" });
        }
        res.send(status);
    }
}