import { controller, httpGet, interfaces } from "inversify-express-utils";
import { Request, Response } from "express";
import { inject } from "inversify";
import { TYPES } from "../types";
import { Config } from "../config";
import ImageService from "../services/imageService";
import StatusService from "../services/statusService";
import DirectApiService from "../services/directApiService";
import { apiKeyCheck } from "../middlewares/apiKeycheck";

@controller("/generateImage")
export class GenerateImageController implements interfaces.Controller {
  constructor(
    @inject(TYPES.Config) private config: Config,
    @inject(TYPES.ImageService) private imageService: ImageService,
    @inject(TYPES.StatusService) private statusService: StatusService,
    @inject(TYPES.DirectApiService) private directApiService: DirectApiService,
  ) {}

  @httpGet("/", apiKeyCheck)
  public async generateImage(req: Request, res: Response) {
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
      const headers = {
        "content-type": "application/json",
      };

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
        const sleep = (ms: number) =>
          new Promise((resolve) => setTimeout(resolve, ms));
        await sleep(200);
        fetch("https://fooocus.one/api/predictions/" + data.id, {
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
      res.send({
        success: true,
        imageId: imageId,
        statusUrl: req.hostname + `/status/${imageId}`,
      });
    } else {
      this.statusService.updateImageStatus(imageId, "QUEUED");

      if (loraName && typeof loraName === "string") {
        const loras = await this.directApiService.searchLoras(loraName);
        if (loras.length === 0) {
          this.directApiService.generateImage(prompt, imageId);
        }
        const loraId = loras[0]?.id;
        const triggerWord = loras[0]?.triggers[0];
        this.statusService.updateImageStatus(imageId, "STARTING");
        this.directApiService.generateImage(
          triggerWord + ", " + prompt,
          imageId,
          loraId,
        );
      } else {
        this.statusService.updateImageStatus(imageId, "STARTING");
        this.directApiService.generateImage(prompt, imageId);
      }

      res.send({
        success: true,
        imageId,
        statusUrl: `/status/${imageId}`,
      });
    }
  }
}
