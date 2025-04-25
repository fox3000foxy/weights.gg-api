import { controller, httpPost, interfaces } from "inversify-express-utils";
import { Request, Response } from "express";
import { apiKeyCheck } from "../middlewares/apiKeyCheck";
import { inject } from "inversify";
import { TYPES } from "../types";
import DirectApiService from "../services/directApiService";

@controller("/voice")
export class VoiceController implements interfaces.Controller {
  constructor(@inject(TYPES.DirectApiService) private directApiService: DirectApiService) {}

  @httpPost("/", apiKeyCheck)
  public async generateVoice(req: Request, res: Response): Promise<void> {
    try {
      const { voiceModelName, text, audioUrl, pitch = "0", male = "true" } = req.body;

      if (!text && !audioUrl) {
        return this.sendError(res, 400, "req.body.text or req.body.audioUrl is required.");
      }

      const audioModels = await this.directApiService.searchAudioModels(voiceModelName as string);
      if (!audioModels || audioModels.length === 0) {
        return this.sendError(res, 400, "No audio models found.");
      }

      const result = audioUrl
        ? await this.handleAudioUrl(audioModels[0].id, audioUrl, pitch, male)
        : await this.handleText(audioModels[0].id, text, pitch, male);

      res.json({ result });
    } catch (error) {
      console.error("Error in generateVoice:", error);
      this.sendError(res, 500, "An unexpected error occurred.");
    }
  }

  private async handleAudioUrl(modelId: string, audioUrl: string, pitch: string, male: string) {
    const fileData = await fetch(audioUrl).then(res => res.arrayBuffer());
    const inputUrl = await this.directApiService.uploadAudioFile(Buffer.from(fileData));
    return this.directApiService.createAudioJob(modelId, undefined, inputUrl, pitch, male);
  }

  private async handleText(modelId: string, text: string, pitch: string, male: string) {
    return this.directApiService.createAudioJob(modelId, text, undefined, pitch, male);
  }

  private sendError(res: Response, statusCode: number, message: string): void {
    res.status(statusCode).send({ error: message });
  }
}
