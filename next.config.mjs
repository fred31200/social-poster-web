/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow phone/tablet on local network to load HMR scripts during dev
  allowedDevOrigins: ['192.168.1.15', '192.168.1.0/24'],

  // Next.js dev indicator (the floating "N" icon) — move to bottom-right so it doesn't cover sidebar content
  devIndicators: {
    position: 'bottom-right',
  },
};

export default nextConfig;
