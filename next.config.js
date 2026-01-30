const path = require("path");

const parseOrigins = (value) => {
  if (!value) return [];
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const allowedEmbedOrigins = [
  "https://snout-form.onrender.com",
  "https://backend-291r.onrender.com",
  "https://www.snoutservices.com",
  "https://snoutservices.com",
  "https://leahs-supercool-site-c731e5.webflow.io",
  ...parseOrigins(process.env.NEXT_PUBLIC_WEBFLOW_ORIGIN),
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
    const frameAncestors = allowedEmbedOrigins.length
      ? ["'self'", ...allowedEmbedOrigins]
      : ["'self'"];
    const cspFrameAncestors = frameAncestors.join(" ");

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
    // Exclude enterprise-messaging-dashboard and scripts from compilation
    config.module.rules.push({
      test: /\.ts$/,
      exclude: [
        /node_modules/,
        /enterprise-messaging-dashboard/,
        /scripts/,
      ],
    });
    return config;
  },
  // Exclude enterprise-messaging-dashboard from TypeScript checking
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;


