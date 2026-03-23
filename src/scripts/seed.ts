import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
  console.log('Seeding Database...');
  
  const defaultPassword = await bcrypt.hash('password123', 10);

  // Production-level Operators 
  console.log('Inserting production operators...');
  await db.insert(schema.users).values([
    { id: 'u1', username: 'm.chen', password: defaultPassword, name: 'Michael Chen (CNC)', role: 'OPERATOR' },
    { id: 'u2', username: 's.rodriguez', password: defaultPassword, name: 'Sarah Rodriguez (Milling)', role: 'OPERATOR' },
    { id: 'u3', username: 'd.kim', password: defaultPassword, name: 'David Kim (Assembly)', role: 'OPERATOR' },
    { id: 'u4', username: 'e.williams', password: defaultPassword, name: 'Emma Williams (QA)', role: 'OPERATOR' }
  ]).onConflictDoNothing();

  // Management (Using onConflictDoUpdate as a fallback boss recovery CLI tool)
  console.log('Inserting/Recovering Management accounts...');
  await db.insert(schema.users).values([
    { id: 'a1', username: 'admin', password: defaultPassword, name: 'System Administrator', role: 'ADMIN' },
    { id: 'o1', username: 'boss', password: defaultPassword, name: 'Plant Manager', role: 'OWNER' }
  ]).onConflictDoUpdate({
    target: schema.users.id,
    set: { password: defaultPassword }
  });

  // Machines
  console.log('Inserting machines...');
  await db.insert(schema.machines).values([
    { id: 'm1', name: 'CNC Lathe 01', status: 'OFF', toolLifePercent: 85.0, totalCycles: 1200 },
    { id: 'm2', name: 'Milling Station A', status: 'OFF', toolLifePercent: 42.0, totalCycles: 5800 },
    { id: 'm3', name: 'Drilling Press', status: 'OFF', toolLifePercent: 12.0, totalCycles: 9800 }
  ]).onConflictDoNothing();

  console.log('Seeding complete!');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
