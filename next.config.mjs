/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // sharp + transformers.js ship native/onnx bits that must stay external.
  experimental: {
    serverComponentsExternalPackages: ["sharp", "@xenova/transformers", "onnxruntime-node"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
