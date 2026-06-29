/**
 * Next.js instrumentation hook — runs once when the server starts.
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 *
 * We use this to initialize the scheduler timer.
 */
export async function register() {
  // Only run on the server (not during build)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { restartTimer } = await import('./src/lib/scheduler')
    restartTimer().catch((err) => {
      console.error('[instrumentation] scheduler init error:', err)
    })
  }
}
