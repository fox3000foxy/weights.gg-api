import weightsConfig from "../config";
import { Request, Response, NextFunction } from "express";

export const apiKeyCheck = function (
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const validApiKey = weightsConfig?.API_KEY;
  if (req.hostname !== "localhost") {
    const apiKey = req.headers["x-api-key"];
    if (!validApiKey || apiKey !== validApiKey) {
      res.status(401).send({
        error: "Unauthorized: Missing or invalid API key",
      });
      return;
    }
  }
  next();
};
