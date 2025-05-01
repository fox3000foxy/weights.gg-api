import { Request, Response } from 'express';
import { controller, httpGet } from "inversify-express-utils";

@controller("/health")
export class HealthController {
    @httpGet("/")
    public healthCheck(req: Request, res: Response) {
        res.send({
            status: "OK",
        });
    }
}