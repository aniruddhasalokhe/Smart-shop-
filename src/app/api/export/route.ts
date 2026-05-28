import { NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, users, machines, downtimes } from '@/db/schema';
import { eq, gte, lte, and } from 'drizzle-orm';
import { generateProductionExcel } from '@/lib/exportExcel';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Auth check
  const cookieStore = await cookies();
  const token = cookieStore.get('shopfloor_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    // Build date filters if provided
    const dateFilters: any[] = [];
    if (fromParam) {
      dateFilters.push(gte(jobs.createdAt, new Date(fromParam)));
    }
    if (toParam) {
      const toDate = new Date(toParam);
      toDate.setHours(23, 59, 59, 999);
      dateFilters.push(lte(jobs.createdAt, toDate));
    }

    const dtDateFilters: any[] = [];
    if (fromParam) {
      dtDateFilters.push(gte(downtimes.startTime, new Date(fromParam)));
    }
    if (toParam) {
      const toDate = new Date(toParam);
      toDate.setHours(23, 59, 59, 999);
      dtDateFilters.push(lte(downtimes.startTime, toDate));
    }

    // Fetch jobs with optional date range filter
    let jobsQuery = db
      .select({
        createdAt: jobs.createdAt,
        machineName: machines.name,
        operatorName: users.name,
        componentName: jobs.componentName,
        okParts: jobs.okParts,
        castingRejection: jobs.castingRejection,
        machineRejection: jobs.machineRejection,
        blowHole: jobs.blowHole,
        rework: jobs.rework,
      })
      .from(jobs)
      .innerJoin(machines, eq(jobs.machineId, machines.id))
      .innerJoin(users, eq(jobs.operatorId, users.id))
      .orderBy(jobs.createdAt);

    if (dateFilters.length > 0) {
      jobsQuery = jobsQuery.where(and(...dateFilters)) as any;
    }

    const rawJobs = await jobsQuery;

    // Fetch downtimes with optional date range filter
    let dtQuery = db
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

    if (dtDateFilters.length > 0) {
      dtQuery = dtQuery.where(and(...dtDateFilters)) as any;
    }

    const rawDowntimes = await dtQuery;

    const buffer = await generateProductionExcel(rawJobs, rawDowntimes);

    // Build filename based on date range
    let filename = 'TurboTech_Production_Report';
    if (fromParam && toParam) {
      filename += `_${fromParam}_to_${toParam}`;
    } else if (fromParam) {
      filename += `_from_${fromParam}`;
    } else {
      filename += `_${new Date().toISOString().split('T')[0]}`;
    }
    
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
