import { db } from '@/db';
import * as schema from '@/db/schema';
import { desc } from 'drizzle-orm';
import CalendarView from '@/components/CalendarView';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const machines = await db.select().from(schema.machines);
  const jobs = await db.select().from(schema.jobs).orderBy(desc(schema.jobs.createdAt));
  const users = await db.select().from(schema.users);

  return <CalendarView machines={machines} jobs={jobs} users={users} />;
}
