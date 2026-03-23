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

  // Users
  console.log('Inserting users...');
  await db.insert(schema.users).values([
    { id: 'u1', username: 'operator1', password: defaultPassword, name: 'John Operator', role: 'OPERATOR' },
    { id: 'a1', username: 'supervisor', password: defaultPassword, name: 'Alice Admin', role: 'ADMIN' },
    { id: 'o1', username: 'boss', password: defaultPassword, name: 'Boss Owner', role: 'OWNER' }
  ]).onConflictDoNothing();

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
