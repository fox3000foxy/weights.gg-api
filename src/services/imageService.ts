import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
import * as https from "https";
import * as crypto from "crypto";
import { Config } from "../config";
import { injectable, inject } from "inversify";
import { TYPES } from "../types";

export interface IImageService {
  generateImageId(): string;
  downloadImage(url: string, imageId: string): Promise<string>;
  saveBase64Image(
    base64URL: string,
    imageId: string,
    isFinal?: boolean,
  ): Promise<string>;
  startCleanupInterval(): void;
  stopCleanupInterval(): void;
  runCleanupOnce(): void;
}

@injectable()
export class ImageService implements IImageService {
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  private readonly config: Config;

  constructor(@inject(TYPES.Config) config: Config) {
    this.config = config;
    this.startCleanupInterval();
  }

  public generateImageId(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  public async downloadImage(url: string, imageId: string): Promise<string> {
    const filePath = path.join(
      path.join(__dirname, "..", this.config.IMAGE_DIR),
      `${imageId}.jpg`,
    );

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);

      https
        .get(url, (response) => {
          if (response.statusCode !== 200) {
            fs.unlink(filePath, () => {
              reject(
                new Error(`Failed to download image. Status code: ${response.statusCode}`),
              );
            });
            return;
          }

          response.pipe(file);
          file.on("finish", () => file.close(() => resolve(filePath)));
        })
        .on("error", (err) => {
          fs.unlink(filePath, () => reject(err));
        });
    });
  }

  public async saveBase64Image(
    base64URL: string,
    imageId: string,
    isFinal = false,
  ): Promise<string> {
    const base64Data = base64URL.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");
    const filePath = path.join(
      path.join(__dirname, "..", this.config.IMAGE_DIR),
      `${imageId}.jpg`,
    );

    try {
      if (isFinal) {
        fs.writeFileSync(filePath, buffer);
      } else {
        await sharp(buffer)
          .resize({ width: this.config.IMAGE_WIDTH })
          .jpeg({ quality: 80 })
          .toFile(filePath);
      }
      return filePath;
    } catch (error) {
      console.error("Error saving image:", error);
      throw error;
    }
  }

  private cleanupOldImages(): void {
    const IMAGE_DIR = path.join(__dirname, "..", this.config.IMAGE_DIR);
    fs.readdir(IMAGE_DIR, (err, files) => {
      if (err) {
        console.error("Could not list the directory.", err);
        return;
      }

      const tenMinutes = 10 * 60 * 1000;

      files.forEach((file) => {
        const filePath = path.join(IMAGE_DIR, file);
        fs.stat(filePath, (err, stats) => {
          if (err) {
            console.error("Error reading file stats:", filePath, err);
            return;
          }

          const fileAge = Date.now() - stats.mtimeMs;

          if (fileAge > tenMinutes) {
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error("Error deleting file:", filePath, err);
              } else {
                console.log("File deleted:", filePath);
              }
            });
          }
        });
      });
    });
  }

  public startCleanupInterval(): void {
    if (!this.cleanupIntervalId) {
      this.cleanupOldImages();
      this.cleanupIntervalId = setInterval(() => {
        this.cleanupOldImages();
      }, 60 * 1000);
    }
  }

  public stopCleanupInterval(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  public runCleanupOnce(): void {
    this.cleanupOldImages();
  }
}

export default ImageService;
