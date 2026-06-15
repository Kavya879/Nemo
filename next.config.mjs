import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["sharp", "@xenova/transformers", "onnxruntime-node"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Replace native/ONNX packages with an empty stub so they never get bundled
      // into server chunks during build. They're loaded lazily at runtime via
      // dynamic import() in the service layer (kaputt-grader, clip-pipeline, etc).
      const emptyModule = resolve(__dirname, "empty-module.js");
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...config.resolve.alias,
        "onnxruntime-node": emptyModule,
        // @xenova/transformers is also lazy-imported — safe to stub at build time
        "@xenova/transformers": emptyModule,
      };
    }
    return config;
  },
};

export default nextConfig;
