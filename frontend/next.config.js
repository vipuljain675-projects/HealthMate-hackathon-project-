/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://healthmate-hackathon-project.onrender.com';
    return [
      {
        source: '/scans/:path*',
        destination: `${backendUrl}/scans/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
