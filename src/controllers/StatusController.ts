import { Request, Response } from "express";
import { inject } from "inversify";
import { controller, httpGet, request, response } from "inversify-express-utils";
import { TYPES } from "../types";
import { IStatusService } from "../services/statusService";

@controller("/status")
export class StatusController {
    constructor(
        @inject(TYPES.StatusService) private statusService: IStatusService,
    ) {}

    @httpGet("/:imageId")
    public getImageStatus(@request() req: Request, @response() res: Response) {
        const { imageId } = req.params;
        const status = this.statusService.getImageStatus(imageId);
        res.send(status);
    }
}