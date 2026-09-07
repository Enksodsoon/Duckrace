import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": hooksPlugin,
    },
    settings: { react: { version: "18.3" } },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        console: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        Blob: "readonly",
        FileReader: "readonly",
        performance: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        matchMedia: "readonly",
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...hooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      // Local-storage hydration + derived-state sync use setState in effects
      // intentionally on mount; keep as warning, not CI-blocking error.
      "react-hooks/set-state-in-effect": "warn",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "warn",
    },
  },
  {
    // react-three-fiber uses lowercase host elements (<mesh>, <group>, …)
    // which look like unknown DOM properties to eslint-plugin-react.
    files: ["src/DuckRace3D.jsx"],
    rules: {
      "react/no-unknown-property": "off",
      // Syncing the latest progress into a ref for useFrame is the
      // documented R3F pattern; keep as warning.
      "react-hooks/refs": "warn",
    },
  },
  {
    ignores: ["dist/", "node_modules/"],
  },
];
