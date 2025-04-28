import { controller, httpGet, interfaces } from "inversify-express-utils";
import { Request, Response } from "express";
import { inject } from "inversify";
import { TYPES } from "../types";
import ImageService from "../services/imageService";
import StatusService from "../services/statusService";
import DirectApiService from "../services/directApiService";
import { apiKeyCheck } from "../middlewares/apiKeyCheck";

@controller("/generateImage")
export class GenerateImageController implements interfaces.Controller {
  constructor(
    @inject(TYPES.ImageService) private imageService: ImageService,
    @inject(TYPES.StatusService) private statusService: StatusService,
    @inject(TYPES.DirectApiService) private directApiService: DirectApiService,
  ) {}

  @httpGet("/", apiKeyCheck)
  public async generateImage(req: Request, res: Response): Promise<void> {
    try {
      const { prompt, loraName } = req.query;

      if (!prompt || typeof prompt !== "string" || prompt.length < 10) {
        return this.sendError(res, 400, "Prompt is too short");
      }

      const imageId = this.imageService.generateImageId();

      if (process.env.FOOOCUS_ENABLED && (!loraName || typeof loraName !== "string")) {
        await this.handleFooocusGeneration(req, res, prompt as string, imageId);
      } else {
        await this.handleDirectApiGeneration(res, prompt as string, loraName as string, imageId);
      }
    } catch (error) {
      console.error("Error in generateImage:", error);
      this.sendError(res, 500, "An unexpected error occurred.");
    }
  }

  private async handleFooocusGeneration(req: Request, res: Response, prompt: string, imageId: string): Promise<void> {
    try {
      const headers = { "content-type": "application/json" };
      const { data } = await fetch("https://fooocus.one/api/predictions", {
        headers,
        body: JSON.stringify({
          model: "black-forest-labs/flux-schnell",
          input: {
            prompt,
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

      const output = await this.pollFooocusOutput(data.id, headers);
      if (!output) throw new Error("Failed to retrieve Fooocus output");

      await this.imageService.downloadImage(output, imageId);
      this.statusService.updateImageStatus(imageId, "COMPLETED");

      res.json({
        success: true,
        imageId,
        statusUrl: `${req.hostname}/status/${imageId}`,
      });
    } catch (error) {
      console.error("Error in handleFooocusGeneration:", error);
      this.sendError(res, 500, "Error generating image with Fooocus.");
    }
  }

  private async pollFooocusOutput(predictionId: string, headers: Record<string, string>): Promise<string | null> {
    let output = null;
    while (!output) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const data = await fetch(`https://fooocus.one/api/predictions/${predictionId}`, {
        headers,
        method: "GET",
      }).then((res) => res.json());
      if (data.output) {
        output = data.output[0];
      }
    }
    return output;
  }

  private async handleDirectApiGeneration(res: Response, prompt: string, loraName: string, imageId: string): Promise<void> {
    this.statusService.updateImageStatus(imageId, "QUEUED");

    if (loraName) {
      const loras = await this.directApiService.searchLoras(loraName);
      if (loras.length === 0) {
        this.directApiService.generateImage(prompt, imageId);
      } else {
        const loraId = loras[0]?.id;
        const triggerWord = loras[0]?.triggers[0];
        this.statusService.updateImageStatus(imageId, "STARTING");
        this.directApiService.generateImage(`${triggerWord}, ${prompt}`, imageId, loraId);
      }
    } else {
      this.statusService.updateImageStatus(imageId, "STARTING");
      this.directApiService.generateImage(prompt, imageId);
    }

    res.json({
      success: true,
      imageId,
      statusUrl: `/status/${imageId}`,
    });
  }

  private sendError(res: Response, statusCode: number, message: string): void {
    res.status(statusCode).send({ error: message });
  }
}
