import { config } from "dotenv";
config();

interface Config {
  API_URL: string;
  API_KEY: string;
  WEIGHTS_GG_COOKIE: string;
  PORT: number;
  MAX_QUEUE_SIZE: number;
  IMAGE_WIDTH: number;
  IMAGE_DIR: string;
  LORA_CACHE_FILE: string;
}

export const weightsConfig: Config = {
  API_URL: process.env.API_URL || "",
  API_KEY: process.env.API_KEY || "",
  WEIGHTS_GG_COOKIE: process.env.WEIGHTS_GG_COOKIE || "",
  PORT: parseInt(process.env.PORT || "3000", 10),
  MAX_QUEUE_SIZE: parseInt(process.env.MAX_QUEUE_SIZE || "10", 10),
  IMAGE_WIDTH: 400,
  // IMAGE_DIR: path.join(__dirname,'../..','images'),
  IMAGE_DIR: "../images",
  LORA_CACHE_FILE: "lora_cache.json",
};

export default weightsConfig;
export { Config };
