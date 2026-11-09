import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@prisma/client", "bcryptjs"],
  // Hide the floating Next.js "N" / Turbopack badge in local + tunnel demos.
  // Runtime/build errors still surface; this only removes the indicator chip.
  devIndicators: false,
  // Dev overlay / HMR + Cloudflare quick tunnels (Edge HTTPS demos)
  allowedDevOrigins: ["127.0.0.1", "localhost", "*.trycloudflare.com"],
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(self), usb=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
