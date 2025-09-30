import withPWA from "next-pwa";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Handle worker errors gracefully and improve module resolution
  webpack: (config, { dev, isServer }) => {
    // Enhanced module resolution for Docker/Sevalla environment
    config.resolve.extensions = ['.tsx', '.ts', '.jsx', '.js', '.json'];

    // Ensure proper alias resolution with explicit @/ mapping
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }

    // Add explicit @/ alias resolution
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');

    // Fix pino-pretty worker thread issues in Next.js
    // See: https://github.com/vercel/next.js/discussions/46987
    config.externals.push({
      'thread-stream': 'commonjs thread-stream',
      'pino': 'commonjs pino',
      'pino-pretty': 'commonjs pino-pretty'
    });

    if (!dev && !isServer) {
      Object.assign(config.resolve.alias, {
        'react/jsx-runtime.js': 'react/jsx-runtime',
        'react/jsx-dev-runtime.js': 'react/jsx-dev-runtime',
      });
    }

    // Enhanced module resolution for container environments
    config.resolve.symlinks = false;
    config.resolve.cacheWithContext = false;

    // Add verbose module resolution for debugging
    if (process.env.WEBPACK_VERBOSE) {
      console.log('Webpack config paths:', {
        extensions: config.resolve.extensions,
        alias: config.resolve.alias,
        modules: config.resolve.modules
      });
    }

    return config;
  },
  // Increase timeout for API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
