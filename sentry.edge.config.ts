// Sentry in the edge runtime (proxy.ts), loaded by register() in instrumentation.ts.
import * as Sentry from '@sentry/nextjs'
import { sentryOptions } from '@/lib/sentry-options'

Sentry.init(sentryOptions)
