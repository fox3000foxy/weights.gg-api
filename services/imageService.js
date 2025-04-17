 // --- imageService.js ---
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const https = require('https');

class ImageService {
    constructor(config) {
        this.config = config;
        this.cleanupIntervalId = null;
        this.startCleanupInterval();
    }

    generateImageId() {
        const crypto = require('crypto');
        return crypto.randomBytes(16).toString("hex");
    }

    async downloadImage(url, imageId) {
        return new Promise((resolve, reject) => {
            const filePath = path.join(this.config.IMAGE_DIR, `${imageId}.jpg`);
            const file = fs.createWriteStream(filePath);

            https.get(url, (response) => {
                response.pipe(file);
                file.on('finish', () => file.close(() => resolve(filePath)));
            }).on('error', (err) => {
                fs.unlink(filePath, () => reject(err)); // Delete the file if an error occurs
            });
        });
    }

    async saveBase64Image(base64Data, imageId, isFinal = false) {
        const buffer = Buffer.from(base64Data, 'base64');
        const fileNameSuffix = isFinal ? '-final' : '';
        const filePath = path.join(this.config.IMAGE_DIR, `${imageId}${fileNameSuffix}.jpg`);

        try {
            if (isFinal) {
                fs.writeFileSync(filePath, buffer);
                console.log(`Final image saved to ${filePath}`);
            } else {
                await sharp(buffer)
                    .resize({ width: this.config.IMAGE_WIDTH })
                    .jpeg({ quality: 80 }) // Adjust quality as needed
                    .toFile(filePath);
                console.log(`Preview image saved to ${filePath}`);
            }
            return filePath;
        } catch (error) {
            console.error("Error saving image:", error);
            throw error;
        }
    }

    cleanupOldImages() {
        const IMAGE_DIR = this.config.IMAGE_DIR;
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

                    const fileAge = Date.now() - stats.mtimeMs; // Modification time
                    const tenMinutes = 10 * 60 * 1000;

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

    startCleanupInterval() {
        if (!this.cleanupIntervalId) {
            this.cleanupOldImages();
            this.cleanupIntervalId = setInterval(() => {
                this.cleanupOldImages();
            }, 60 * 1000); // Check every minute
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

module.exports = ImageService;