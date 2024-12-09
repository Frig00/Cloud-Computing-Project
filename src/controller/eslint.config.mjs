import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import tsParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  {
    plugins: { prettier: prettierPlugin },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json", // Ensure this path points to your TypeScript configuration
      },
      globals: globals.node,
    },
  },
  {
    rules: {
      // Example rules for auto-fixing
      semi: ["warn", "always"],
      quotes: ["warn", "single"],
      indent: ["warn", 2],
      "@typescript-eslint/no-unused-vars": ["warn"],
      "prettier/prettier": "warn",
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "no-async-promise-executor": "warn",
      ...prettierConfig.rules,
    },
  },
];
