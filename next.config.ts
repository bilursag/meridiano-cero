import type { NextConfig } from "next";

// The production deployment's vercel.app aliases. Staging and other preview deployments live on
// different vercel.app hosts and are left alone.
const VERCEL_PRODUCTION_HOSTS = "meridiano-cero(-meridiano-cero|-git-main-meridiano-cero)?\\.vercel\\.app";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // Production auth (Clerk) only works on app.meridianocero.cl, so send the old address there.
        // Temporary for now so browsers don't cache it while the domain change settles.
        source: "/:path*",
        has: [{ type: "host", value: VERCEL_PRODUCTION_HOSTS }],
        destination: "https://app.meridianocero.cl/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
