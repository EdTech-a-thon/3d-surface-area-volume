import js from "@eslint/js";
import globals from "globals";
import svelte from "eslint-plugin-svelte";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs["flat/recommended"],
  prettier,
  ...svelte.configs["flat/prettier"],
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    ignores: [
      ".svelte-kit/",
      "build/",
      "dist/",
      "node_modules/",
      "test-results/",
    ],
  },
);
