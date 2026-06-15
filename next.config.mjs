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
};

export default nextConfig;
