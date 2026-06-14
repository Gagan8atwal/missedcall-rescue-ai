/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
    // Ensure Twilio and other Node-only packages are not bundled for the edge runtime
    serverComponentsExternalPackages: ['twilio'],
  },
};
module.exports = nextConfig;
