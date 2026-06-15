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
      // Mark native packages as external so webpack never tries to bundle them.
      // They're resolved at runtime from node_modules instead.
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
        "onnxruntime-node",
        "sharp",
        "@xenova/transformers",
      ];
    }
    return config;
  },
};

export default nextConfig;
