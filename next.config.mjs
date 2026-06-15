/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // sharp + transformers.js + onnxruntime ship native/ONNX bits that must stay
  // external (never bundled by webpack). Both the stable and experimental keys
  // are set for maximum compatibility across Next.js 14.x minor versions.
  serverExternalPackages: ["sharp", "@xenova/transformers", "onnxruntime-node"],
  experimental: {
    serverComponentsExternalPackages: ["sharp", "@xenova/transformers", "onnxruntime-node"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure native packages are never resolved by webpack on the server.
      config.externals = config.externals || [];
      config.externals.push("onnxruntime-node", "sharp", "@xenova/transformers");
    }
    return config;
  },
};

export default nextConfig;
