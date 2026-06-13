/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @xenova/transformers ships native/onnx bits that must stay external on the server.
  experimental: {
    serverComponentsExternalPackages: ["@xenova/transformers"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
