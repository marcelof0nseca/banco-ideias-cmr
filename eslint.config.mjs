import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

/**
 * ESLint flat config (ESLint 10 + eslint-config-next 16).
 * Dono do CI/lint: Pessoa B.
 */
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "prisma/gen/**",
      "prototipo/**",
      "docs/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // Parametros/variaveis prefixados com "_" sao intencionais (stubs de
      // contrato que ainda nao usam o argumento). Ver CONTRIBUTING.md.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];

export default config;
