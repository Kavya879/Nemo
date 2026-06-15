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
      config.externals = config.externals || [];
      config.externals.push({
        "onnxruntime-node": "commonjs onnxruntime-node",
        sharp: "commonjs sharp",
        "@xenova/transformers": "commonjs @xenova/transformers",
      });
    }
    return config;
  },
};

export default nextConfig;
