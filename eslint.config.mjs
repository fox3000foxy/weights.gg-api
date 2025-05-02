import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";


export default defineConfig([
  { files: ["**/*.{js,mjs,cjs,ts}"], 
    ignores: ["**/test.js"],
    plugins: { js }, 
    extends: ["js/recommended"] },
  { files: ["**/*.{js,mjs,cjs,ts}"],
    ignores: ["**/*.test.js"],
    languageOptions: { globals: globals.browser } },
  { files: ["**/*.{ts,tsx}"], 
    ignores: ["**/*.test.js"],
    ...tseslint.configs.recommended },
]);