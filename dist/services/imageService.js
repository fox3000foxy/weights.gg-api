"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const https = __importStar(require("https"));
const crypto = __importStar(require("crypto"));
class ImageService {
    constructor(config) {
        this.cleanupIntervalId = null;
        this.config = config;
        this.startCleanupInterval();
    }
    generateImageId() {
        return crypto.randomBytes(16).toString("hex");
    }
    async downloadImage(url, imageId) {
        return new Promise((resolve, reject) => {
            const filePath = path.join(path.join(__dirname, "..", this.config.IMAGE_DIR), `${imageId}.jpg`);
            const file = fs.createWriteStream(filePath);
            https.get(url, (response) => {
                response.pipe(file);
                file.on('finish', () => file.close(() => resolve(filePath)));
            }).on('error', (err) => {
                fs.unlink(filePath, () => reject(err));
            });
        });
    }
    async saveBase64Image(base64Data, imageId, isFinal = false) {
        const buffer = Buffer.from(base64Data, 'base64');
        const fileNameSuffix = isFinal ? '-final' : '';
        const filePath = path.join(path.join(__dirname, "..", this.config.IMAGE_DIR), `${imageId}.jpg`);
        try {
            if (isFinal) {
                fs.writeFileSync(filePath, buffer);
            }
            else {
                await (0, sharp_1.default)(buffer)
                    .resize({ width: this.config.IMAGE_WIDTH })
                    .jpeg({ quality: 80 })
                    .toFile(filePath);
            }
            return filePath;
        }
        catch (error) {
            console.error("Error saving image:", error);
            throw error;
        }
    }
    cleanupOldImages() {
        const IMAGE_DIR = path.join(__dirname, "..", this.config.IMAGE_DIR);
        fs.readdir(IMAGE_DIR, (err, files) => {
            if (err) {
                console.error("Could not list the directory.", err);
                return;
            }
            files.forEach(file => {
                const filePath = path.join(IMAGE_DIR, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) {
                        console.error("Error reading file stats:", filePath, err);
                        return;
                    }
                    const fileAge = Date.now() - stats.mtimeMs;
                    const tenMinutes = 10 * 60 * 1000;
                    if (fileAge > tenMinutes) {
                        fs.unlink(filePath, (err) => {
                            if (err) {
                                console.error("Error deleting file:", filePath, err);
                            }
                            else {
                                console.log("File deleted:", filePath);
                            }
                        });
                    }
                });
            });
        });
    }
    startCleanupInterval() {
        if (!this.cleanupIntervalId) {
            this.cleanupOldImages();
            this.cleanupIntervalId = setInterval(() => {
                this.cleanupOldImages();
            }, 60 * 1000);
        }
    }
    stopCleanupInterval() {
        if (this.cleanupIntervalId) {
            clearInterval(this.cleanupIntervalId);
            this.cleanupIntervalId = null;
        }
    }
    runCleanupOnce() {
        this.cleanupOldImages();
    }
}
exports.ImageService = ImageService;
exports.default = ImageService;
