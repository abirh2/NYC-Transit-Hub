import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { readdirSync, rmSync } from "node:fs";

const repositoryRoot = __dirname;
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://nyctransithub.vercel.app";
const nativeOutputDirectory = path.join(repositoryRoot, "capacitor-web");

function omitWebServiceWorker() {
  return {
    name: "omit-web-service-worker",
    closeBundle() {
      for (const fileName of readdirSync(nativeOutputDirectory)) {
        if (fileName === "sw.js" || fileName === "sw.js.map" || fileName.startsWith("workbox-")) {
          rmSync(path.join(nativeOutputDirectory, fileName), { force: true });
        }
      }
    },
  };
}

export default defineConfig({
  root: path.join(repositoryRoot, "native"),
  publicDir: path.join(repositoryRoot, "public"),
  base: "./",
  plugins: [react(), omitWebServiceWorker()],
  define: {
    "process.env.NEXT_PUBLIC_APP_TARGET": JSON.stringify("ios"),
    "process.env.NEXT_PUBLIC_API_BASE_URL": JSON.stringify(apiBaseUrl),
    "process.env.NEXT_PUBLIC_SUPABASE_URL": "undefined",
    "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": "undefined",
  },
  resolve: {
    alias: [
      { find: "next/navigation", replacement: path.join(repositoryRoot, "native/shims/next-navigation.ts") },
      { find: "next/link", replacement: path.join(repositoryRoot, "native/shims/next-link.tsx") },
      { find: "next/dynamic", replacement: path.join(repositoryRoot, "native/shims/next-dynamic.tsx") },
      { find: "next/image", replacement: path.join(repositoryRoot, "native/shims/next-image.tsx") },
      { find: "@", replacement: repositoryRoot },
    ],
  },
  build: {
    outDir: nativeOutputDirectory,
    emptyOutDir: true,
    sourcemap: false,
  },
});
