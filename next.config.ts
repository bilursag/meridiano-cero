import { withSentryConfig } from "@sentry/nextjs/config";
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

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/uploading/bundler-plugin-options/

  org: "meridiano-cero",

  project: "meridiano-cero",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // Not "/monitoring": proxy.ts protects '/monitor(.*)', which would block reports from signed-out pages.
  tunnelRoute: "/diagnostico",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
