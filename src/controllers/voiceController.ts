import { controller, httpPost, interfaces } from "inversify-express-utils";
import { Request, Response } from "express";
import { apiKeyCheck } from "../middlewares/apiKeyCheck";
import { inject } from "inversify";
import { AudioModel, TYPES } from "../types";
import DirectApiService from "../services/directApiService";

@controller("/voice")
export class VoiceController implements interfaces.Controller {
  constructor(@inject(TYPES.DirectApiService) private directApiService: DirectApiService) {}
  @httpPost("/", apiKeyCheck)
  public async generateVoice(req: Request, res: Response): Promise<void> {
    const { voiceModelName } = req.body;

    const text = req.body.text as string || undefined;
    const audioUrl = req.body.audioUrl as string || undefined;

    if (!text && !audioUrl) {
      res.status(400).send({
        error: "req.body.text or req.body.audioUrl is required.",
      });
      return;
    }
    
    const audioModels: AudioModel[] = await this.directApiService.searchAudioModels(voiceModelName as string);
    if (!audioModels || audioModels.length === 0) {
      res.status(400).send({
        error: "No audio models found.",
      });
      return;
    }
    if(audioUrl) {
        // const fileData = await fs.promises.readFile("./exemple.mp3");
        const fileData = await fetch(audioUrl).then(res => res.arrayBuffer());
        const inputUrl = await this.directApiService.uploadAudioFile(Buffer.from(fileData));    
        const result = await this.directApiService.createAudioJob(audioModels[0].id, undefined,  inputUrl);
        res.json({
            result,
        });    
    }
    else {
        const result = await this.directApiService.createAudioJob(audioModels[0].id, text);
        res.json({
            result,
        });
    }
  }
}