import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".open-next/**",
    "out/**",
    "build/**",
    "public/ffmpeg/**",
    "public/tesseract/**",
    "playwright-report/**",
    "test-results/**",
    ".dev.log",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
