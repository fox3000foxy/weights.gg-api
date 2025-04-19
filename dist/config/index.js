"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.weightsConfig = void 0;
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
exports.weightsConfig = {
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
exports.default = exports.weightsConfig;
