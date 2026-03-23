import { db } from '@/db';
import * as schema from '@/db/schema';
import { desc } from 'drizzle-orm';
import DashboardView from '@/components/DashboardView';

export const dynamic = 'force-dynamic';

export default async function OwnerDashboard() {
  const machines = await db.select().from(schema.machines);
  const jobs = await db.select().from(schema.jobs).orderBy(desc(schema.jobs.createdAt)).limit(100);
  const users = await db.select().from(schema.users);
  const attendances = await db.select().from(schema.attendances).orderBy(desc(schema.attendances.loginTime)).limit(100);

  return <DashboardView machines={machines} jobs={jobs} users={users} attendances={attendances} />;
}
