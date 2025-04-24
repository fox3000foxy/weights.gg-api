import { Express, NextFunction, Request, Response } from "express";
import { Config } from "../config";
import { ImageService } from "./imageService";
import { StatusService } from "./statusService";
import LoraService from "./loraService";
import DirectApiService from "./directApiService";

const apiKeyCheck =
  (config: Config) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (req.hostname !== "localhost") {
      const apiKey = req.headers["x-api-key"];
      if (!apiKey || apiKey !== config.API_KEY) {
        res.status(401).send({
          error: "Unauthorized: Missing or invalid API key",
        });
        return;
      }
    }
    next();
  };

const healthRoute = (req: Request, res: Response) => {
  res.send({
    status: "OK",
  });
};

const statusRoute =
  (statusService: StatusService) => (req: Request, res: Response) => {
    const { imageId } = req.params;
    const status = statusService.getImageStatus(imageId);
    res.send(status);
  };

const searchLoraRoute =
  (loraService: LoraService) => async (req: Request, res: Response) => {
    const { query } = req.query;
    if (!query || typeof query !== "string") {
      res.status(400).send({
        error: "Query parameter is required.",
      });
      return;
    }

    const loras = await loraService.searchLoras(query);
    res.send(loras);
  };

const generateImageRoute =
  (
    config: Config,
    imageService: ImageService,
    directApiService: DirectApiService,
    statusService: StatusService,
  ) =>
  async (req: Request, res: Response) => {
    const { prompt, loraName } = req.query;

    if (!prompt || typeof prompt !== "string" || prompt.length < 10) {
      res.status(400).send({ error: "Prompt is too short" });
      return;
    }

    const imageId = imageService.generateImageId();

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
      await imageService.downloadImage(output, imageId);
      statusService.updateImageStatus(imageId, "COMPLETED");
      res.setHeader("Content-Type", "application/json");
      res.send({
        success: true,
        imageId: imageId,
        statusUrl: req.hostname + `/status/${imageId}`,
      });
    } else {
      statusService.updateImageStatus(imageId, "QUEUED");

      if (loraName && typeof loraName === "string") {
        const loras = await directApiService.searchLoras(loraName);
        if (loras.length === 0) {
          directApiService.generateImage(prompt, imageId);
        }
        const loraId = loras[0]?.id;
        const triggerWord = loras[0]?.triggers[0];
        statusService.updateImageStatus(imageId, "STARTING");
        directApiService.generateImage(
          triggerWord + ", " + prompt,
          imageId,
          loraId,
        );
      } else {
        statusService.updateImageStatus(imageId, "STARTING");
        directApiService.generateImage(prompt, imageId);
      }

      res.send({
        success: true,
        imageId,
        statusUrl: `/status/${imageId}`,
      });
    }
  };

const quotaRoute =
  (directApiService: DirectApiService) =>
  async (_req: Request, res: Response) => {
    const quota = await directApiService.getQuotas();
    res.send(quota);
  };

export const setupRoutes = (
  app: Express,
  config: Config,
  loraSerice: LoraService,
  statusService: StatusService,
  imageService: ImageService,
  directApiService: DirectApiService,
): void => {
  app.use(apiKeyCheck(config));

  app.get("/health", healthRoute);
  app.get("/status/:imageId", statusRoute(statusService));
  app.get("/search-loras", searchLoraRoute(loraSerice));
  app.get(
    "/generateImage",
    generateImageRoute(config, imageService, directApiService, statusService),
  );
  app.get("/quota", quotaRoute(directApiService));
};

export default setupRoutes;
