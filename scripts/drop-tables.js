// Test script: drop all tables, then verify the app self-heals on next API call
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function main() {
  console.log('Dropping all tables...')
  await db.$executeRawUnsafe('DROP TABLE IF EXISTS "WorkingProxy"')
  await db.$executeRawUnsafe('DROP TABLE IF EXISTS "ScheduledRun"')
  await db.$executeRawUnsafe('DROP TABLE IF EXISTS "ScheduleConfig"')
  console.log('✅ Tables dropped')

  // Verify they're gone
  try {
    await db.scheduleConfig.findUnique({ where: { id: 'default' } })
    console.log('❌ Table still exists (unexpected)')
  } catch (err) {
    console.log('✅ Confirmed tables are gone:', err.message.slice(0, 80))
  }

  await db.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
