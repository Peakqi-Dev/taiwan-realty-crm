/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // /signup is now an alias for the Beta onboarding page — the LINE-first
      // auth flow makes the standalone email signup unnecessary.
      { source: "/signup", destination: "/beta", permanent: false },
    ];
  },
};

export default nextConfig;
