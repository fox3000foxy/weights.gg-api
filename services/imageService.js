// --- imageService.js ---
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const https = require('https');

class ImageService {
    constructor(config) {
        this.config = config;
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
}

module.exports = ImageService;