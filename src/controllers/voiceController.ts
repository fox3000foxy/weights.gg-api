import { controller, httpPost, interfaces } from "inversify-express-utils";
import { Request, Response } from "express";
import { apiKeyCheck } from "../middlewares/apiKeyCheck";
import { inject } from "inversify";
import { AudioModel, TYPES } from "../types";
import DirectApiService from "../services/directApiService";
import fs from "fs";

@controller("/voice")
export class VoiceController implements interfaces.Controller {
  constructor(@inject(TYPES.DirectApiService) private directApiService: DirectApiService) {}
  @httpPost("/", apiKeyCheck)
  public async generateVoice(req: Request, res: Response): Promise<void> {
    const { voiceModelName } = req.body;

    const text = req.body.text as string || undefined;

    const audioModels: AudioModel[] = await this.directApiService.searchAudioModels(voiceModelName as string);
    if (!audioModels || audioModels.length === 0) {
      res.status(400).send({
        error: "No audio models found.",
      });
      return;
    }
    if(!text) {
        const fileData = await fs.promises.readFile("./exemple.mp3");
        const inputUrl = await this.directApiService.uploadAudioFile(fileData);    
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
/*
    Exemple usage using fetch

    const response = await fetch("http://localhost:3000/voice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "84a516841ba77a5b4648de2cd0dfcb30ea46dbb4",
      },
      body: JSON.stringify({
        voiceModelName: "voice-model-name",
        text: "Hello world",
      }),
    });
    const data = await response.json();
    console.log(data);
*/
