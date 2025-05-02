import { Request, Response } from 'express';
import { controller, httpGet } from "inversify-express-utils";
import { checkApiKey } from '../middlewares/checkApiKey';

@controller("/health")
export class HealthController {
    @httpGet("/", checkApiKey)
    public healthCheck(req: Request, res: Response) {
        res.send({
            status: "OK",
        });
    }
}