import { ImageGenerationResult } from "./types";
declare global {
    interface Window {
        handlePreviewUpdate: (data: ImageGenerationResult) => void;
    }
}
