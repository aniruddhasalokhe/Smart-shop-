import { db } from '@/db';
import * as schema from '@/db/schema';
import { desc } from 'drizzle-orm';
import DowntimeView from '@/components/DowntimeView';

export const dynamic = 'force-dynamic';

export default async function DowntimePage() {
  const downtimes = await db.select().from(schema.downtimes).orderBy(desc(schema.downtimes.startTime));
  const machines = await db.select().from(schema.machines);
  const users = await db.select().from(schema.users);

  return <DowntimeView downtimes={downtimes} machines={machines} users={users} />;
}
