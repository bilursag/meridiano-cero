// Sentry in the browser. Session Replay is left out on purpose: it would record screens that show
// children's data.
import * as Sentry from '@sentry/nextjs'
import { sentryOptions } from '@/lib/sentry-options'

Sentry.init(sentryOptions)

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
