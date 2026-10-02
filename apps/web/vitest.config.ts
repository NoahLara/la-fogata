import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Next compiles JSX itself; here it has to be turned into calls too.
  esbuild: { jsx: "automatic" },
  test: { include: ["src/**/*.test.{ts,tsx}"] },
});
