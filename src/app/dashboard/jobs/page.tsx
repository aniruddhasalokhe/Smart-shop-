import { db } from '@/db';
import * as schema from '@/db/schema';
import { desc } from 'drizzle-orm';
import JobHistoryView from '@/components/JobHistoryView';

export const dynamic = 'force-dynamic';

export default async function JobHistoryPage() {
  const jobs = await db.select().from(schema.jobs).orderBy(desc(schema.jobs.createdAt));
  const machines = await db.select().from(schema.machines);
  const users = await db.select().from(schema.users);

  return <JobHistoryView jobs={jobs} machines={machines} users={users} />;
}
