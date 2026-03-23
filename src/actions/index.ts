'use server';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function logout() {
  const session = await getSession();
  if (session) {
    await db.update(schema.attendances)
      .set({ logoutTime: new Date() })
      .where(and(eq(schema.attendances.userId, session.id), isNull(schema.attendances.logoutTime)));
  }

  const cookieStore = await cookies();
  cookieStore.delete('shopfloor_token');
  redirect('/login');
}

export async function getMachines() {
  return await db.select().from(schema.machines);
}

export async function getCurrentUser() {
  return await getSession();
}

export async function getRecentJobs() {
  return await db.select().from(schema.jobs).orderBy(desc(schema.jobs.createdAt)).limit(20);
}

export async function updateMachineStatus(machineId: string, status: string, reason?: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  
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
      id: `d-${Date.now()}`,
      machineId,
      operatorId: session.id,
      reason,
      startTime: new Date()
    });
  }
}

export async function resolveDowntime(machineId: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  
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

  const [machine] = await db.select().from(schema.machines).where(eq(schema.machines.id, machineId));
  if (!machine) throw new Error('Machine not found');

  const totalProcessed = jobData.okParts + jobData.castingRejection + jobData.machineRejection + jobData.blowHole + jobData.rework;
  const toolLifeDecrease = totalProcessed * 0.05; // 0.05% per part

  // Log job
  await db.insert(schema.jobs).values({
    id: `j-${Date.now()}`,
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
  
  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash(data.passwordRaw, 10);
  
  await db.insert(schema.users).values({
    id: `usr-${Date.now()}`,
    username: data.username,
    name: data.name,
    password: hashedPassword,
    role: 'OPERATOR'
  });
}

export async function importMachines(csvData: string) {
  const session = await getSession();
  if (!session || session.role !== 'OWNER') throw new Error('Unauthorized');

  const lines = csvData.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  // Skipping header row heuristically if it says 'name'
  if (lines[0].toLowerCase().includes('name')) lines.shift();

  const newNodes = lines.map((name, idx) => ({
    id: `m-${Date.now()}-${idx}`,
    name,
    status: 'OFF'
  }));

  if (newNodes.length > 0) {
    await db.insert(schema.machines).values(newNodes);
  }
}

export async function resetEmployeePassword(targetUserId: string, newPasswordRaw: string) {
  const session = await getSession();
  if (!session || session.role !== 'OWNER') throw new Error('Unauthorized');

  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash(newPasswordRaw, 10);

  await db.update(schema.users)
    .set({ password: hashedPassword })
    .where(eq(schema.users.id, targetUserId));
}

export async function changeMyPassword(newPasswordRaw: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash(newPasswordRaw, 10);

  await db.update(schema.users)
    .set({ password: hashedPassword })
    .where(eq(schema.users.id, session.id));
}

