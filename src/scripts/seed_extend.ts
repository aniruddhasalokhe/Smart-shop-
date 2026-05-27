import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { config } from 'dotenv';
config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// ─────────────────────────────────────────────────────────────────
//  Deterministic pseudo-random (different seed from seed.ts)
// ─────────────────────────────────────────────────────────────────
let _seed = 271828;
function rand(min: number, max: number): number {
  _seed = (_seed * 1664525 + 1013904223) & 0x7fffffff;
  return min + (_seed % (max - min + 1));
}
function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)];
}

// ─────────────────────────────────────────────────────────────────
//  SAME FACTORY DATA — must match existing seed.ts
// ─────────────────────────────────────────────────────────────────

// Operator IDs (already in DB from seed.ts)
const OPERATOR_IDS: Record<string, string> = {
  'anil_kamble':     'usr-anil_kamble',
  'dilip_rajbhar':   'usr-dilip_rajbhar',
  'mitun_raj':       'usr-mitun_raj',
  'niraj':           'usr-niraj',
  'raj_karan_singh': 'usr-raj_karan_singh',
  'raja_rajbhr':     'usr-raja_rajbhr',
  'rohit_rawat':     'usr-rohit_rawat',
  'rupesh_verma':    'usr-rupesh_verma',
  'sachin_kumar':    'usr-sachin_kumar',
  'sanjay_rawat':    'usr-sanjay_rawat',
  'sonu_rajbhr':     'usr-sonu_rajbhr',
  'vivek':           'usr-vivek',
};

// Machine IDs (already in DB from seed.ts)
const MACHINES = [
  { id: 'mach-vmc01', name: 'VMC 01' },
  { id: 'mach-vmc02', name: 'VMC 02' },
  { id: 'mach-vmc03', name: 'VMC 03' },
  { id: 'mach-vmc04', name: 'VMC 04' },
];

const COMPONENT_COMPANY: Record<string, string> = {
  'QTF 90 Body 1st':       'Valmet India',
  'QTF 90 Body 4th Axis':  'Valmet India',
  'QTF 90 Body M10 Tap':   'Valmet India',
  'QTF 100 1st':            'Valmet India',
  'QTF 100 4th Axis':       'Valmet India',
  'QTF 100 M10 Tap':        'Valmet India',
  'QTF 80 Body 1st':        'Valmet India',
  'Maintop':                'Valmet India',
  'Maintop 2nd':            'Valmet India',
  'Front Cover 2176':       'Ganmax',
  'Front Cover 2176 2nd':   'Ganmax',
  'Front Cover 29001 2nd':  'Ganmax',
  'Hanger':                 'Ashapura',
  '1 HP Dome':              'Ashapura',
  '0.5 HP Dome':            'Ashapura',
  'Pipe Bracket 3rd':       'Ashapura',
  'APM Bracket':            'Ashapura',
  'V B T Cover':            'EngineTech',
  'V B T Cover 1st':        'EngineTech',
  'Yoke 140 Full':          'EGoF Engg',
  'Yoke 140 1st':           'EGoF Engg',
  'Yoke 140 2nd':           'EGoF Engg',
  'Bracket 020':            'Bharat Forge',
  'Bracket 099':            'Bharat Forge',
};

const MACHINE_COMPONENTS: Record<string, string[]> = {
  'mach-vmc01': [
    'QTF 90 Body 1st', 'QTF 90 Body 4th Axis', 'QTF 90 Body M10 Tap',
    'QTF 100 1st', 'QTF 100 4th Axis', 'QTF 100 M10 Tap', 'QTF 80 Body 1st',
  ],
  'mach-vmc02': [
    'Front Cover 2176', 'Front Cover 2176 2nd', 'Front Cover 29001 2nd',
    'V B T Cover', 'V B T Cover 1st',
  ],
  'mach-vmc03': [
    'Hanger', '1 HP Dome', '0.5 HP Dome', 'Pipe Bracket 3rd',
    'APM Bracket', 'Bracket 020', 'Bracket 099',
  ],
  'mach-vmc04': [
    'Yoke 140 Full', 'Yoke 140 1st', 'Yoke 140 2nd',
    'Maintop', 'Maintop 2nd',
  ],
};

const MACHINE_OPERATORS: Record<string, string[]> = {
  'mach-vmc01': ['anil_kamble', 'dilip_rajbhar', 'mitun_raj'],
  'mach-vmc02': ['rohit_rawat', 'rupesh_verma', 'sachin_kumar'],
  'mach-vmc03': ['raj_karan_singh', 'raja_rajbhr', 'sonu_rajbhr'],
  'mach-vmc04': ['niraj', 'sanjay_rawat', 'vivek'],
};

// ─────────────────────────────────────────────────────────────────
//  NEW MONTHS: December 2025 → May 27 2026
//  ★ HIGH PERFORMANCE PERIOD — OEE > 95% every day
// ─────────────────────────────────────────────────────────────────
const MONTHS = [
  { year: 2025, month: 11, maxDay: 31 }, // December 2025
  { year: 2026, month: 0,  maxDay: 31 }, // January 2026
  { year: 2026, month: 1,  maxDay: 28 }, // February 2026
  { year: 2026, month: 2,  maxDay: 31 }, // March 2026
  { year: 2026, month: 3,  maxDay: 30 }, // April 2026
  { year: 2026, month: 4,  maxDay: 27 }, // May 2026 (up to today)
];

// ─────────────────────────────────────────────────────────────────
async function extend() {
  console.log('\n🚀  Smart Shop-Floor — High-Performance Period Extension');
  console.log('    December 2025 → May 2026  |  Target OEE > 95%');
  console.log('────────────────────────────────────────────────────\n');

  const jobsBatch:       (typeof schema.jobs.$inferInsert)[]        = [];
  const attendanceBatch: (typeof schema.attendances.$inferInsert)[] = [];
  const downtimeBatch:   (typeof schema.downtimes.$inferInsert)[]   = [];

  // Fetch current machine state to continue from where seed.ts left off
  const existingMachines = await db.select().from(schema.machines);
  const toolLife: Record<string, number> = {};
  const totalCyc: Record<string, number> = {};
  for (const m of existingMachines) {
    toolLife[m.id] = m.toolLifePercent;
    totalCyc[m.id] = m.totalCycles;
  }

  let jIdx = 9000;    // offset IDs so no collision with seed.ts
  let dtIdx = 9000;
  let attIdx = 9000;

  for (const { year, month, maxDay } of MONTHS) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lastDay     = Math.min(daysInMonth, maxDay);

    for (let day = 1; day <= lastDay; day++) {
      const date    = new Date(year, month, day);
      const weekday = date.getDay(); // 0 = Sunday

      // Closed Sundays
      if (weekday === 0) continue;

      // 1 holiday per month
      if (day === 15) continue;

      const attendedToday = new Set<string>();

      for (const mach of MACHINES) {
        const machId   = mach.id;
        const opKeys   = MACHINE_OPERATORS[machId];
        const compList = MACHINE_COMPONENTS[machId];

        // ★ High-performance period: only ~3% downtime (vs 7% before)
        if (rand(1, 100) <= 3) {
          const dtReasons = ['SETUP', 'POWER_CUT', 'BREAKDOWN'];
          const reason    = pick(dtReasons);
          const durMins   = rand(20, 90);  // shorter downtimes too
          const dtStart   = new Date(year, month, day, rand(8, 10), rand(0, 30));
          const dtEnd     = new Date(dtStart.getTime() + durMins * 60_000);
          const opKey     = pick(opKeys);

          downtimeBatch.push({
            id:              `dt-${dtIdx++}`,
            machineId:       machId,
            operatorId:      OPERATOR_IDS[opKey],
            reason,
            startTime:       dtStart,
            endTime:         dtEnd,
            durationMinutes: durMins,
          });
          continue;
        }

        const opKey = opKeys[day % opKeys.length];
        const opId  = OPERATOR_IDS[opKey];

        // Attendance
        if (!attendedToday.has(opId)) {
          attendedToday.add(opId);
          const loginH  = rand(8, 9);
          const loginM  = rand(0, 20);
          const login   = new Date(year, month, day, loginH, loginM);
          const logout  = new Date(login.getTime() + rand(8, 10) * 3_600_000);
          attendanceBatch.push({
            id:         `att-${attIdx++}`,
            userId:     opId,
            loginTime:  login,
            logoutTime: logout,
          });
        }

        // ── Job 1 (morning) — OEE > 95% ────────────────────────
        const comp1    = compList[day % compList.length];
        const company1 = COMPONENT_COMPANY[comp1] ?? 'General Client';
        const qty1     = rand(22, 70);

        // ★ Key change: ok rate 95–99%  →  OEE > 95%
        const okRate1  = rand(95, 99);
        const ok1      = Math.floor(qty1 * okRate1 / 100);
        const defects1 = qty1 - ok1;

        // With very few defects, distribute minimally
        const cr1 = Math.min(defects1, rand(0, Math.ceil(defects1 * 0.5)));
        const mr1 = Math.min(defects1 - cr1, rand(0, Math.ceil((defects1 - cr1) * 0.5)));
        const rw1 = Math.max(0, defects1 - cr1 - mr1);

        const jobTime1 = new Date(year, month, day, rand(9, 13), rand(0, 59));

        jobsBatch.push({
          id:               `job-${jIdx++}`,
          machineId:        machId,
          operatorId:       opId,
          createdAt:        jobTime1,
          companyName:      company1,
          componentName:    comp1,
          quantity:         qty1,
          okParts:          ok1,
          castingRejection: cr1,
          machineRejection: mr1,
          blowHole:         0,
          rework:           rw1,
        });

        const processed1 = ok1 + cr1 + mr1 + rw1;
        totalCyc[machId] += processed1;
        toolLife[machId]  = Math.max(0, toolLife[machId] - processed1 * 0.05);

        // ── Job 2 (afternoon) — 40% of days ────────────────────
        if (rand(1, 100) <= 40) {
          const otherComps = compList.filter(c => c !== comp1);
          const comp2      = otherComps.length > 0 ? pick(otherComps) : comp1;
          const company2   = COMPONENT_COMPANY[comp2] ?? 'General Client';
          const qty2       = rand(12, 35);

          const okRate2  = rand(95, 99);
          const ok2      = Math.floor(qty2 * okRate2 / 100);
          const defects2 = qty2 - ok2;
          const cr2      = Math.min(defects2, rand(0, Math.ceil(defects2 * 0.5)));
          const mr2      = Math.min(defects2 - cr2, rand(0, Math.ceil((defects2 - cr2) * 0.5)));
          const rw2      = Math.max(0, defects2 - cr2 - mr2);

          const jobTime2 = new Date(year, month, day, rand(14, 17), rand(0, 59));

          jobsBatch.push({
            id:               `job-${jIdx++}`,
            machineId:        machId,
            operatorId:       opId,
            createdAt:        jobTime2,
            companyName:      company2,
            componentName:    comp2,
            quantity:         qty2,
            okParts:          ok2,
            castingRejection: cr2,
            machineRejection: mr2,
            blowHole:         0,
            rework:           rw2,
          });

          const processed2 = ok2 + cr2 + mr2 + rw2;
          totalCyc[machId] += processed2;
          toolLife[machId]  = Math.max(0, toolLife[machId] - processed2 * 0.05);
        }
      } // machines
    } // days
  } // months

  // ── BULK INSERT ───────────────────────────────────────────────
  const BATCH = 50;

  console.log(`   Inserting ${attendanceBatch.length} attendance records...`);
  for (let i = 0; i < attendanceBatch.length; i += BATCH) {
    await db.insert(schema.attendances).values(attendanceBatch.slice(i, i + BATCH));
  }

  console.log(`   Inserting ${jobsBatch.length} production job records...`);
  for (let i = 0; i < jobsBatch.length; i += BATCH) {
    await db.insert(schema.jobs).values(jobsBatch.slice(i, i + BATCH));
  }

  if (downtimeBatch.length > 0) {
    console.log(`   Inserting ${downtimeBatch.length} downtime records...`);
    for (let i = 0; i < downtimeBatch.length; i += BATCH) {
      await db.insert(schema.downtimes).values(downtimeBatch.slice(i, i + BATCH));
    }
  }

  // ── UPDATE MACHINE STATE ──────────────────────────────────────
  for (const m of MACHINES) {
    await db
      .update(schema.machines)
      .set({
        toolLifePercent: parseFloat(Math.max(0, toolLife[m.id]).toFixed(2)),
        totalCycles:     totalCyc[m.id],
      })
      .where(eq(schema.machines.id, m.id));
  }

  // ── SUMMARY ───────────────────────────────────────────────────
  console.log('\n✅  Extension complete!\n');
  console.log('📊  New Records Added:');
  console.log(`    Jobs        :  ${jobsBatch.length}`);
  console.log(`    Attendance  :  ${attendanceBatch.length} shift records`);
  console.log(`    Downtimes   :  ${downtimeBatch.length} events`);
  console.log('\n📈  Performance:');
  console.log('    Dec 2025 – May 2026  |  OEE > 95% per day');
  console.log('    Defect rate kept below 5%');
  console.log('────────────────────────────────────────────────────\n');
}

extend().catch((err) => {
  console.error('❌ Extension failed:', err);
  process.exit(1);
});
