const path = require("path");

const allowedEmbedOrigins = [
  "https://snout-form.onrender.com",
  process.env.NEXT_PUBLIC_WEBFLOW_ORIGIN,
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_BASE_URL,
  process.env.RENDER_EXTERNAL_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
].filter(Boolean);

const nextConfig = {
  serverExternalPackages: ["@prisma/client"],
  images: {
    domains: ["localhost"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: "/booking-form",
        destination: "/booking-form.html",
      },
    ];
  },
  async headers() {
    const cspFrameAncestors = ["'self'", ...allowedEmbedOrigins].join(" ");

    return [
      {
        source: "/booking-form",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: `frame-ancestors ${cspFrameAncestors}` },
        ],
      },
      {
        source: "/booking-form.html",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: `frame-ancestors ${cspFrameAncestors}` },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname, "src");
    return config;
  },
};

module.exports = nextConfig;


