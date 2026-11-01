import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [react()],
  markdown: { shikiConfig: { theme: "github-light" } },
});
