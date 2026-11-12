// Shared by the browser, Node and edge Sentry setups (instrumentation-client.ts, sentry.*.config.ts).
// The DSN is public by design: browsers send it with every report.
export const sentryOptions = {
  dsn: 'https://d816d78604c2441ec10a200e17c1fb12@o4512416018464768.ingest.us.sentry.io/4512416025411584',

  // Local `next dev` stays out of Sentry; deployed builds report (Vercel sets the environment tag).
  enabled: process.env.NODE_ENV === 'production',

  // A sample of requests is enough to spot slow pages and keeps the free plan's quota.
  tracesSampleRate: 0.1,

  // Request bodies carry children's names, locations and messages: keep them out of Sentry, along
  // with the automatic user fields (IP address, account id).
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
}
