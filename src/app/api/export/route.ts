import { NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, users, machines, downtimes } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateProductionExcel } from '@/lib/exportExcel';
import { getSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Auth check
  const cookieStore = await cookies();
  const token = cookieStore.get('shopfloor_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch jobs with machine and operator names via join
    const rawJobs = await db
      .select({
        createdAt: jobs.createdAt,
        machineName: machines.name,
        operatorName: users.name,
        componentName: jobs.componentName,
        okParts: jobs.okParts,
        castingRejection: jobs.castingRejection,
        machineRejection: jobs.machineRejection,
        rework: jobs.rework,
      })
      .from(jobs)
      .innerJoin(machines, eq(jobs.machineId, machines.id))
      .innerJoin(users, eq(jobs.operatorId, users.id))
      .orderBy(jobs.createdAt);

    // Fetch downtimes with machine names
    const rawDowntimes = await db
      .select({
        machineId: downtimes.machineId,
        machineName: machines.name,
        reason: downtimes.reason,
        startTime: downtimes.startTime,
        durationMinutes: downtimes.durationMinutes,
      })
      .from(downtimes)
      .innerJoin(machines, eq(downtimes.machineId, machines.id))
      .orderBy(downtimes.startTime);

    const buffer = await generateProductionExcel(rawJobs, rawDowntimes);

    const today = new Date().toISOString().split('T')[0];
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="TurboTech_Production_Report_${today}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
