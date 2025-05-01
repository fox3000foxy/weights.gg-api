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
  saveBase64Image(base64Data: string, imageId: string, isFinal?: boolean): Promise<string>;
  startCleanupInterval(): void;
  stopCleanupInterval(): void;
  runCleanupOnce(): void;
}

@injectable()
export class ImageService implements IImageService {
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  private readonly config: Config;
  private readonly imageDir: string;

  constructor(
    @inject(TYPES.Config) config: Config
  ) {
    this.config = config;
    this.imageDir = path.join(__dirname, "..", this.config.IMAGE_DIR);
    this.startCleanupInterval();
  }

  public generateImageId(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  public async downloadImage(url: string, imageId: string): Promise<string> {
    const filePath = path.join(this.imageDir, `${imageId}.jpg`);

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);

      https
        .get(url, (response) => {
          response.pipe(file);
          file.on("finish", () => file.close(() => resolve(filePath)));
        })
        .on("error", (err) => {
          fs.unlink(filePath, () => reject(err));
        });
    });
  }

  public async saveBase64Image(
    base64Data: string,
    imageId: string,
    isFinal = false,
  ): Promise<string> {
    const buffer = Buffer.from(base64Data, "base64");
    const filePath = path.join(this.imageDir, `${imageId}.jpg`);

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

  private async deleteFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error("Error deleting file:", filePath, err);
          reject(err);
        } else {
          console.log("File deleted:", filePath);
          resolve();
        }
      });
    });
  }

  private async cleanupOldImages(): Promise<void> {
    fs.readdir(this.imageDir, async (err, files) => {
      if (err) {
        console.error("Could not list the directory.", err);
        return;
      }

      for (const file of files) {
        const filePath = path.join(this.imageDir, file);
        try {
          const stats = await fs.promises.stat(filePath);
          const fileAge = Date.now() - stats.mtimeMs;
          const tenMinutes = 10 * 60 * 1000;

          if (fileAge > tenMinutes) {
            await this.deleteFile(filePath);
          }
        } catch (error) {
          console.error("Error processing file:", filePath, error);
        }
      }
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
