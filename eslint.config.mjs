// @ts-check

import eslint from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/*.snapshot/", "**/__fixtures__/", ""],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "warn",
    },
  },
  {
    files: ["**/*.mjs", "**/__test__/**"],
    ...tseslint.configs.disableTypeChecked,
  },
  prettierConfig,
);
