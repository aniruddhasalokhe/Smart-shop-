'use server';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Valid machine status values
const VALID_STATUSES = ['ON', 'OFF', 'DOWNTIME'] as const;

export async function logout() {
  const session = await getSession();
  if (session) {
    // Fix Bug #16: Only update the most recent open attendance record
    const openRecords = await db.select()
      .from(schema.attendances)
      .where(and(
        eq(schema.attendances.userId, session.id),
        isNull(schema.attendances.logoutTime)
      ))
      .orderBy(desc(schema.attendances.loginTime))
      .limit(1);

    if (openRecords.length > 0) {
      await db.update(schema.attendances)
        .set({ logoutTime: new Date() })
        .where(eq(schema.attendances.id, openRecords[0].id));
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete('shopfloor_token');
  redirect('/login');
}

export async function getMachines() {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  return await db.select().from(schema.machines);
}

export async function getCurrentUser() {
  return await getSession();
}

export async function getRecentJobs() {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  return await db.select().from(schema.jobs).orderBy(desc(schema.jobs.createdAt)).limit(20);
}

export async function updateMachineStatus(machineId: string, status: string, reason?: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  // Fix Bug #6: Validate status value
  if (!VALID_STATUSES.includes(status as any)) {
    throw new Error(`Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  
  await db.update(schema.machines)
    .set({ 
      status, 
      currentOperatorId: status === 'OFF' ? null : session.id,
      downtimeReason: status === 'DOWNTIME' ? reason : null,
      lastStatusChange: new Date()
    })
    .where(eq(schema.machines.id, machineId));
    
  // If reporting downtime
  if (status === 'DOWNTIME' && reason) {
    await db.insert(schema.downtimes).values({
      id: `d-${crypto.randomUUID()}`,
      machineId,
      operatorId: session.id,
      reason,
      startTime: new Date()
    });
  }
}

// Fix Bug #3: resolveDowntime now closes the downtime record
export async function resolveDowntime(machineId: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  
  // Close the open downtime record
  const openDowntimes = await db.select()
    .from(schema.downtimes)
    .where(and(
      eq(schema.downtimes.machineId, machineId),
      isNull(schema.downtimes.endTime)
    ))
    .orderBy(desc(schema.downtimes.startTime))
    .limit(1);

  if (openDowntimes.length > 0) {
    const dt = openDowntimes[0];
    const now = new Date();
    const durationMinutes = Math.round((now.getTime() - dt.startTime.getTime()) / 60000);
    
    await db.update(schema.downtimes)
      .set({ endTime: now, durationMinutes })
      .where(eq(schema.downtimes.id, dt.id));
  }

  await db.update(schema.machines)
    .set({ status: 'ON', downtimeReason: null, lastStatusChange: new Date() })
    .where(eq(schema.machines.id, machineId));
}

export async function logJob(
  machineId: string, 
  jobData: { companyName: string; componentName: string; quantity: number, okParts: number, castingRejection: number, machineRejection: number, blowHole: number, rework: number }
) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  // Validate numeric fields are non-negative
  const numericFields = ['okParts', 'castingRejection', 'machineRejection', 'blowHole', 'rework', 'quantity'] as const;
  for (const field of numericFields) {
    const val = jobData[field];
    if (typeof val !== 'number' || val < 0 || !Number.isFinite(val)) {
      throw new Error(`Invalid value for ${field}: must be a non-negative number`);
    }
  }

  const [machine] = await db.select().from(schema.machines).where(eq(schema.machines.id, machineId));
  if (!machine) throw new Error('Machine not found');

  const totalProcessed = jobData.okParts + jobData.castingRejection + jobData.machineRejection + jobData.blowHole + jobData.rework;
  const toolLifeDecrease = totalProcessed * 0.05; // 0.05% per part

  // Log job with UUID
  await db.insert(schema.jobs).values({
    id: `j-${crypto.randomUUID()}`,
    machineId,
    operatorId: session.id,
    ...jobData,
    createdAt: new Date()
  });

  // Update Machine tool life
  await db.update(schema.machines)
    .set({ 
      toolLifePercent: Math.max(0, machine.toolLifePercent - toolLifeDecrease),
      totalCycles: machine.totalCycles + totalProcessed
    })
    .where(eq(schema.machines.id, machineId));
}

export async function createEmployee(data: { username: string; name: string; passwordRaw: string }) {
  const session = await getSession();
  if (!session || session.role !== 'OWNER') throw new Error('Unauthorized');
  
  // Input validation
  if (!data.username || data.username.trim().length === 0) throw new Error('Username is required');
  if (!data.name || data.name.trim().length === 0) throw new Error('Name is required');
  if (!data.passwordRaw || data.passwordRaw.length < 4) throw new Error('Password must be at least 4 characters');

  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash(data.passwordRaw, 10);
  
  await db.insert(schema.users).values({
    id: `usr-${crypto.randomUUID()}`,
    username: data.username.trim(),
    name: data.name.trim(),
    password: hashedPassword,
    role: 'OPERATOR'
  });
}

export async function importMachines(csvData: string) {
  const session = await getSession();
  if (!session || session.role !== 'OWNER') throw new Error('Unauthorized');

  const lines = csvData.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  // Skipping header row heuristically if it says 'name'
  if (lines[0]?.toLowerCase().includes('name')) lines.shift();

  const newNodes = lines
    .filter(name => name.length > 0 && name.length <= 100) // Sanitize
    .map((name) => ({
      id: `m-${crypto.randomUUID()}`,
      name: name.replace(/[<>]/g, ''), // Strip HTML tags
      status: 'OFF'
    }));

  if (newNodes.length > 0) {
    await db.insert(schema.machines).values(newNodes);
  }
}

// Fix Bug #15: Block resetting OWNER passwords
export async function resetEmployeePassword(targetUserId: string, newPasswordRaw: string) {
  const session = await getSession();
  if (!session || session.role !== 'OWNER') throw new Error('Unauthorized');
  if (!newPasswordRaw || newPasswordRaw.length < 4) throw new Error('Password must be at least 4 characters');

  // Prevent targeting OWNER accounts
  const [targetUser] = await db.select().from(schema.users).where(eq(schema.users.id, targetUserId));
  if (!targetUser) throw new Error('User not found');
  if (targetUser.role === 'OWNER') throw new Error('Cannot reset another owner\'s password');

  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash(newPasswordRaw, 10);

  await db.update(schema.users)
    .set({ password: hashedPassword })
    .where(eq(schema.users.id, targetUserId));
}

export async function changeMyPassword(newPasswordRaw: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  if (!newPasswordRaw || newPasswordRaw.length < 4) throw new Error('Password must be at least 4 characters');

  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash(newPasswordRaw, 10);

  await db.update(schema.users)
    .set({ password: hashedPassword })
    .where(eq(schema.users.id, session.id));
}
