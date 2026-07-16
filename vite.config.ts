import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  // Tauri points its webview at a fixed devUrl (5173) — if the port is taken,
  // fail instead of silently serving on 5174 where the desktop app can't see it
  server: { strictPort: true },
  clearScreen: false,
});
