/**
 * Next.js instrumentation hook — runs once when the server starts.
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 *
 * We use this to:
 *   1. Initialize the SQLite database schema (CREATE TABLE IF NOT EXISTS)
 *   2. Start the scheduler timer for automatic proxy testing
 *
 * The DB init is the primary mechanism for schema creation — it does NOT
 * depend on `prisma db push` running in the CMD, which makes it robust
 * across HuggingFace / Render / Docker deployments.
 */
export async function register() {
  // Only run on the server (not during build)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // 1. Initialize database schema (creates tables if missing)
      const { initDatabase } = await import('./src/lib/db-init')
      await initDatabase()
    } catch (err) {
      console.error('[instrumentation] DB init error:', err)
      // Don't crash — the app can still serve requests, just DB features won't work
    }

    try {
      // 2. Start the scheduler timer (will no-op if DB isn't ready)
      const { restartTimer } = await import('./src/lib/scheduler')
      restartTimer().catch((err) => {
        console.error('[instrumentation] scheduler init error:', err)
      })
    } catch (err) {
      console.error('[instrumentation] scheduler load error:', err)
    }
  }
}
