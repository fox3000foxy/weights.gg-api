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
// filepath: /weights-selenium/weights-selenium/src/index.ts
const express_1 = __importDefault(require("express"));
const events = __importStar(require("events"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_1 = __importDefault(require("./config"));
const puppeteerService_1 = __importDefault(require("./services/puppeteerService"));
const queueService_1 = require("./services/queueService");
const imageService_1 = __importDefault(require("./services/imageService"));
const loraService_1 = __importDefault(require("./services/loraService"));
const statusService_1 = __importDefault(require("./services/statusService"));
const routes_1 = __importDefault(require("./services/routes"));
const imageProcessor_1 = __importDefault(require("./processors/imageProcessor"));
const loraSearchProcessor_1 = __importDefault(require("./processors/loraSearchProcessor"));
const previewHandler_1 = require("./handlers/previewHandler");
const types_1 = require("./types");
// --- Services Initialization ---
const puppeteerService = new puppeteerService_1.default();
const imageService = new imageService_1.default(config_1.default);
const loraService = new loraService_1.default(config_1.default);
const statusService = new statusService_1.default();
// --- Queue Initialization ---
const imageQueue = new queueService_1.ImageQueue(config_1.default.MAX_QUEUE_SIZE);
const loraSearchQueue = new queueService_1.SearchQueue();
// --- Express App ---
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.static(path.join(__dirname, config_1.default.IMAGE_DIR)));
// --- Services ---
const imageProcessor = new imageProcessor_1.default(puppeteerService, imageService, loraService, statusService, config_1.default, imageQueue);
const loraSearchProcessor = new loraSearchProcessor_1.default(loraService);
// --- Queue Processors ---
const processImageJob = async (job, generationPage) => {
    await imageProcessor.processImage(job, generationPage);
};
const processLoraSearchJob = async (job, loraSearchPage) => {
    await loraSearchProcessor.processLoraSearch(job, loraSearchPage);
};
// --- Main Function ---
async function main() {
    // Create the 'images' directory if it doesn't exist
    if (!fs.existsSync(path.join(__dirname, config_1.default.IMAGE_DIR))) {
        fs.mkdirSync(path.join(__dirname, config_1.default.IMAGE_DIR));
        console.log(`Directory "${path.join(__dirname, config_1.default.IMAGE_DIR)}" created.`);
    }
    await puppeteerService.initialize();
    await Promise.all([
        puppeteerService.onStart(puppeteerService.generationPage, config_1.default.WEIGHTS_GG_COOKIE),
        puppeteerService.onStart(puppeteerService.loraSearchPage, config_1.default.WEIGHTS_GG_COOKIE),
    ]);
    const emitter = new events.EventEmitter();
    // Add event listeners
    emitter.on(types_1.EVENT_TYPES.PREVIEW_UPDATE, (data) => {
        return data;
    });
    emitter.on(types_1.EVENT_TYPES.STATUS_UPDATE, (data) => {
        statusService.updateImageStatus(data.imageId, data.status, data.error);
    });
    const previewHandler = new previewHandler_1.PreviewHandler(imageService, statusService, emitter);
    if (!puppeteerService.generationPage)
        return;
    if (!puppeteerService.loraSearchPage)
        return;
    // Expose the function directly without debounce
    await puppeteerService.generationPage.exposeFunction("handlePreviewUpdate", (data) => previewHandler.handlePreviewUpdate(data));
    // Setup the event listener in the browser context
    await puppeteerService.generationPage.evaluate(() => {
        window.addEventListener("previewUpdate", (event) => {
            window.handlePreviewUpdate(event.detail);
        });
    });
    imageQueue.process(processImageJob, puppeteerService.generationPage);
    loraSearchQueue.process(processLoraSearchJob, puppeteerService.loraSearchPage);
    (0, routes_1.default)(app, config_1.default, puppeteerService, imageService, statusService, imageQueue, loraSearchQueue, emitter);
    app.listen(config_1.default.PORT, () => {
        console.log(`Server is running on port ${config_1.default.PORT}`);
    });
}
main().catch(console.error);
