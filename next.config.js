const path = require("path");
const { withSentryConfig } = require("@sentry/nextjs");

const withSerwistInit = require("@serwist/next").default;
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/offline", revision: "offline-v1" }],
});

const parseOrigins = (value) => {
  if (!value) return [];
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const isPersonalMode = process.env.NEXT_PUBLIC_PERSONAL_MODE === "true";
const personalEmbedOrigins = [
  "https://snout-form.onrender.com",
  "https://backend-291r.onrender.com",
  "https://www.snoutservices.com",
  "https://snoutservices.com",
  "https://leahs-supercool-site-c731e5.webflow.io",
];
const allowedEmbedOrigins = [
  ...(isPersonalMode ? personalEmbedOrigins : []),
  ...parseOrigins(process.env.NEXT_PUBLIC_WEBFLOW_ORIGIN),
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_BASE_URL,
  process.env.RENDER_EXTERNAL_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
].filter(Boolean);

const nextConfig = {
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ["@prisma/client", "twilio"],
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

    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      // CSP: permissive baseline; tighten as needed (NextAuth, images, etc.)
      {
        key: "Content-Security-Policy",
        value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.googleadservices.com https://googleads.g.doubleclick.net; script-src-elem 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://www.googleadservices.com https://googleads.g.doubleclick.net; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src-elem 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data: blob: https:; font-src 'self' data: https://cdnjs.cloudflare.com; connect-src 'self' https: wss: https://www.google-analytics.com https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net; frame-ancestors ${cspFrameAncestors}`,
      },
    ];

    return [
      { source: "/:path*", headers: securityHeaders },
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
    config.module.rules.push({
      test: /\.ts$/,
      exclude: [
        /node_modules/,
        /enterprise-messaging-dashboard/,
        /scripts/,
        /prisma\/seed.*\.ts$/,
      ],
    });
    // Suppress "Critical dependency" warning from dynamic imports in runtime-proof
    config.module.exprContextCritical = false;
    return config;
  },
  // Exclude enterprise-messaging-dashboard from TypeScript checking
  typescript: {
    ignoreBuildErrors: false,
  },
};

const configWithSerwist = withSerwist(nextConfig);

module.exports = withSentryConfig(configWithSerwist, {
  org: process.env.SENTRY_ORG || "snout",
  project: process.env.SENTRY_PROJECT || "snout-os",
  silent: !process.env.CI,
});


