"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateImage = void 0;
async function generateImage(prompt, page, emitter, imageId) {
    console.log("Generating image with prompt:", prompt);
    const imageUrl = await page.evaluate(async (prompt, imageId) => {
        const sleepBrowser = (ms) => new Promise(r => setTimeout(r, ms));
        async function waitForAndQuerySelector(selector) {
            while (!document.querySelector(selector)) {
                console.log(`${selector} not loaded yet, waiting...`);
                await sleepBrowser(10);
            }
            return document.querySelector(selector);
        }
        const existingPrompt = document.querySelector(".break-words");
        if (existingPrompt) {
            prompt = existingPrompt.textContent + ", " + prompt;
            console.log("Prompt updated to:", prompt);
        }
        const imageInput = await waitForAndQuerySelector("#imagegen-input");
        if (!imageInput)
            throw new Error("Image input not found");
        imageInput.focus();
        imageInput.click();
        imageInput.innerText = prompt;
        imageInput.dispatchEvent(new Event("input", { bubbles: true }));
        imageInput.dispatchEvent(new Event("change", { bubbles: true }));
        imageInput.dispatchEvent(new Event("blur", { bubbles: true }));
        console.log("Image generation input focused and prompt set:", prompt);
        const generateButton = await waitForAndQuerySelector("body > div.MuiModal-root.css-1sucic7 > div.flex.outline-none.flex-col.items-center.gap-4.w-full.md\\:w-\\[400px\\].min-h-\\[200px\\].absolute.bottom-0.md\\:bottom-auto.md\\:top-1\\/2.md\\:left-1\\/2.md\\:-translate-x-1\\/2.md\\:-translate-y-1\\/2.px-6.py-6.rounded-t-3xl.md\\:rounded-3xl.shadow-lg.bg-white.dark\\:bg-neutral-800.max-h-screen.overflow-y-auto.overflow-x-hidden.pb-\\[var\\(--is-mobile-pb\\)\\].md\\:pb-\\[var\\(--is-mobile-pb-md\\)\\] > button.flex.w-full.items-center.justify-center.gap-2.rounded-lg.bg-black.px-3.py-1.font-bold.text-white.hover-scale");
        if (!generateButton)
            throw new Error("Generate button not found");
        generateButton.click();
        let generatedImageElement = document.querySelector('img[alt="Generated Image"]');
        while (generatedImageElement && generatedImageElement.src) {
            await sleepBrowser(10);
            generatedImageElement = document.querySelector('img[alt="Generated Image"]');
            const errorToast = document.querySelector(".Toastify__toast-container");
            if (errorToast) {
                errorToast.remove();
                console.log("Error toast removed");
                return { error: "Error generating image. Filters doesn't really love your prompt..." };
            }
        }
        let oldPreview = null;
        while (!generatedImageElement || !generatedImageElement.src) {
            console.log("Image not generated yet, waiting...");
            await sleepBrowser(10);
            const errorToast = document.querySelector(".Toastify__toast-container");
            if (errorToast) {
                errorToast.remove();
                console.log("Error toast removed");
                return { error: "Error generating image. Filters doesn't really love your prompt..." };
            }
            const previewElement = document.querySelector('img[alt="image-preview"]');
            if (previewElement && oldPreview !== previewElement.src) {
                oldPreview = previewElement.src;
                window.dispatchEvent(new CustomEvent('previewUpdate', {
                    detail: { url: oldPreview, imageId }
                }));
            }
            generatedImageElement = document.querySelector('img[alt="Generated Image"]');
        }
        return { url: generatedImageElement.src, imageId };
    }, prompt, imageId);
    return imageUrl;
}
exports.generateImage = generateImage;
exports.default = generateImage;
