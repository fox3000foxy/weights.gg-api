import { inject } from "inversify";
import { controller, httpGet, request, response } from "inversify-express-utils";
import { Config } from "../config";
import { IImageQueue } from "../services/queueService";
import { IImageService } from "../services/imageService";
import { IStatusService } from "../services/statusService";
import { IPuppeteerService } from "../services/puppeteerService";
import { GenerateImageJob } from "../types";
import { TYPES } from "../types";
import { EventEmitter } from "events";
import { Request, Response } from "express";

let generateTimer: number = 0;

@controller("/generateImage")
export class ImageController {
  private events = new EventEmitter();

  constructor(
    @inject(TYPES.ImageQueue) private imageQueue: IImageQueue,
    @inject(TYPES.Config) private config: Config,
    @inject(TYPES.ImageService) private imageService: IImageService,
    @inject(TYPES.PuppeteerService) private puppeteerService: IPuppeteerService,
    @inject(TYPES.StatusService) private statusService: IStatusService,
  ) {}

  @httpGet("/")
  public async generateImage(@request() req: Request, @response() res: Response) {
    if (!generateTimer) {
      generateTimer = 100;
    } else {
      while (generateTimer < 0) {
        generateTimer--;
        return;
      }
    }

    if (this.imageQueue.size >= this.config.MAX_QUEUE_SIZE) {
      res.status(429).send({ error: "Server is busy. Please try again later." });
      return;
    }

    const { prompt, loraName } = req.query;
    if (!prompt || typeof prompt !== "string" || prompt.length < 10) {
      res.status(400).send({ error: "Prompt is too short" });
      return;
    }

    const imageId = this.imageService.generateImageId();

    if (
      process.env.FOOOCUS_ENABLED &&
      (!loraName || typeof loraName !== "string")
    ) {
      const headers = { "content-type": "application/json" };
      const { data } = await fetch("https://fooocus.one/api/predictions", {
        headers,
        body: JSON.stringify({
          model: "black-forest-labs/flux-schnell",
          input: {
            prompt: req.query.prompt,
            go_fast: true,
            megapixels: "0.25",
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "webp",
            output_quality: 100,
            num_inference_steps: 4,
            disable_safety_checker: true,
          },
        }),
        method: "POST",
      }).then((res) => res.json());

      let output = null;
      while (!output) {
        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
        await sleep(200);
        await fetch("https://fooocus.one/api/predictions/" + data.id, {
          headers,
          referrer: "https://fooocus.one/fr/apps/flux",
          referrerPolicy: "strict-origin-when-cross-origin",
          body: null,
          method: "GET",
          mode: "cors",
          credentials: "include",
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.output) {
              output = data.output[0];
            }
          });
      }

      fetch(output)
        .then((response) => {
          if (!response.ok) throw new Error("Network response was not ok");
          if (!response.body) throw new Error("Response body is null");
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send("Error fetching image");
        });
      await this.imageService.downloadImage(output, imageId);
      this.statusService.updateImageStatus(imageId, "COMPLETED");
      res.setHeader("Content-Type", "application/json");
      res.send({ success: true, imageId });
    } else {
      const job: GenerateImageJob = {
        prompt: prompt as string,
        loraName: typeof loraName === "string" ? loraName : null,
        imageId,
        res,
        emitter: this.events,
      };
      this.statusService.updateImageStatus(imageId, "QUEUED");
      this.imageQueue.enqueue({
        job,
        id: imageId,
        data: { prompt },
      });
      res.send({ success: true, imageId });
    }
  }
}
