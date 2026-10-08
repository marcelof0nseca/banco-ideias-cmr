import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Vitest 5 / Vite resolvem os paths do tsconfig ("@/*") nativamente.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
    globals: false,
  },
});
