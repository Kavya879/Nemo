import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // These native/ONNX packages are only ever loaded lazily at runtime via
  // dynamic import() in the service layer. Listing them here keeps them out of
  // the server bundle so webpack never tries to bundle their native binaries.
  experimental: {
    serverComponentsExternalPackages: ["sharp", "@xenova/transformers", "onnxruntime-node"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  webpack: (config) => {
    // Explicitly map the "@/..." alias to ./src so module resolution works on
    // every platform, even if Next.js's automatic tsconfig "paths" detection
    // doesn't kick in during the production build (observed on Linux CI).
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "src"),
    };
    return config;
  },
};

export default nextConfig;
