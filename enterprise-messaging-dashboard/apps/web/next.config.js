/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@snoutos/shared'],
  // Exclude API files from webpack compilation
  webpack: (config, { isServer }) => {
    // Exclude API directory from compilation
    config.module.rules.push({
      test: /\.ts$/,
      exclude: [
        /node_modules/,
        /apps\/api/,
        /enterprise-messaging-dashboard\/apps\/api/,
        /\.\.\/api/,
      ],
    });
    return config;
  },
  // Exclude API directory from TypeScript checking
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
