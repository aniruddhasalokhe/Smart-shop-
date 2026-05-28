import ExcelJS from 'exceljs';

interface JobRow {
  createdAt: Date;
  machineName: string;
  operatorName: string;
  componentName: string;
  okParts: number;
  castingRejection: number;
  machineRejection: number;
  rework: number;
}

interface DowntimeRow {
  machineId: string;
  machineName: string;
  reason: string;
  startTime: Date;
  durationMinutes: number | null;
}

const MACHINES = ['VMC 01', 'VMC 02', 'VMC 03', 'VMC 04'];
const MACHINE_COL_OFFSET = 27;
const HEADERS = [
  'Date', 'Day', 'Shift', 'Time In', 'Time Out',
  'Oprator Name', 'Component Name', 'Cycle Time', 'loading/ unloading', 'Norms',
  'OK', 'CR', 'MR', 'R/W', 'Total',
  'Setting Time', 'Machine Break dawn', 'Power cut off',
  'Vehicle loading/unloading', 'No Oprator', 'No Load', 'Other',
  '%', 'Status', 'Remark'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Default cycle times per component (minutes) — based on typical VMC machining
const CYCLE_TIMES: Record<string, number> = {
  'QTF 90 Body 1st': 12,
  'QTF 90 Body 4th Axis': 15,
  'QTF 90 Body M10 Tap': 8,
  'QTF 100 1st': 14,
  'QTF 100 4th Axis': 16,
  'QTF 100 M10 Tap': 9,
  'QTF 80 Body 1st': 11,
  'Maintop': 10,
  'Maintop 2nd': 10,
  'Front Cover 2176': 10.5,
  'Front Cover 2176 2nd': 9,
  'Front Cover 29001 2nd': 11,
  'Hanger': 7,
  '1 HP Dome': 6,
  '0.5 HP Dome': 5.5,
  'Pipe Bracket 3rd': 8,
  'APM Bracket': 7.5,
  'V B T Cover': 9,
  'V B T Cover 1st': 9,
  'Yoke 140 Full': 18,
  'Yoke 140 1st': 12,
  'Yoke 140 2nd': 13,
  'Bracket 020': 8,
  'Bracket 099': 8.5,
};

function getShift(date: Date): { shift: 'I' | 'II' | 'III'; timeIn: number; timeOut: number } {
  const hour = date.getHours();
  if (hour >= 8 && hour < 16) return { shift: 'I', timeIn: 8, timeOut: 16 };
  if (hour >= 16 && hour < 24) return { shift: 'II', timeIn: 16, timeOut: 24 };
  return { shift: 'III', timeIn: 0, timeOut: 8 };
}

function calcNorms(cycleTime: number, loadUnload: number, shiftHours: number): number {
  const total = cycleTime + loadUnload;
  if (total <= 0) return 0;
  return (shiftHours * 60) / total;
}

export async function generateProductionExcel(
  jobs: JobRow[],
  downtimes: DowntimeRow[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TurboTech Industries - Smart Shop Floor';
  workbook.created = new Date();

  // Build downtime lookup: dateStr -> machineName -> { breakdown, powerCut, setup }
  const downtimeMap = new Map<string, Map<string, { breakdown: number; powerCut: number; setup: number }>>();
  for (const dt of downtimes) {
    const d = new Date(dt.startTime);
    const dateStr = d.toISOString().split('T')[0];
    if (!downtimeMap.has(dateStr)) downtimeMap.set(dateStr, new Map());
    const machineMap = downtimeMap.get(dateStr)!;
    if (!machineMap.has(dt.machineName)) machineMap.set(dt.machineName, { breakdown: 0, powerCut: 0, setup: 0 });
    const entry = machineMap.get(dt.machineName)!;
    const mins = dt.durationMinutes || 0;
    if (dt.reason === 'BREAKDOWN') entry.breakdown += mins;
    else if (dt.reason === 'POWER_CUT') entry.powerCut += mins;
    else if (dt.reason === 'SETUP') entry.setup += mins;
  }

  // Group jobs by month
  const byMonth = new Map<string, JobRow[]>();
  for (const job of jobs) {
    const d = new Date(job.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(job);
  }

  // Sort months chronologically
  const sortedMonths = Array.from(byMonth.keys()).sort();

  for (const monthKey of sortedMonths) {
    const monthJobs = byMonth.get(monthKey)!;
    const [year, monthStr] = monthKey.split('-');
    const month = parseInt(monthStr);
    const monthName = MONTH_NAMES[month];
    
    // Sheet name like "April 25", "Dec 25", "Jan 26"
    const shortYear = String(year).substring(2);
    let sheetName = `${monthName.length > 5 ? monthName.substring(0, 3) : monthName} ${shortYear}`;
    // Use full name for April through August, short for rest
    if (['April', 'May', 'June', 'July'].includes(monthName)) {
      sheetName = `${monthName} ${shortYear}`;
    } else {
      sheetName = `${monthName.substring(0, 3)} ${shortYear}`;
    }

    const worksheet = workbook.addWorksheet(sheetName);

    // ── ROW 1: Title Row ──────────────────────────────────
    const firstDay = new Date(parseInt(year), month, 1);
    const lastDay = new Date(parseInt(year), month + 1, 0);

    MACHINES.forEach((machineName, mIdx) => {
      const colOffset = mIdx * MACHINE_COL_OFFSET;

      // Machine title
      const titleCell = worksheet.getCell(1, colOffset + 1);
      titleCell.value = `Daily Production report ${machineName}`;
      titleCell.font = { bold: true, size: 12, color: { argb: 'FF1F4E79' } };
      titleCell.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: 'FFD9EAD3' }
      };

      // Merge title across first 10 columns
      worksheet.mergeCells(1, colOffset + 1, 1, colOffset + 10);

      // Month label
      const monthCell = worksheet.getCell(1, colOffset + 16);
      monthCell.value = `${monthName} ${year}`;
      monthCell.font = { bold: true, size: 10 };

      // Date range
      const fromCell = worksheet.getCell(1, colOffset + 19);
      fromCell.value = firstDay;
      fromCell.numFmt = 'DD-MMM-YYYY';
      fromCell.font = { size: 9 };

      const toLabel = worksheet.getCell(1, colOffset + 21);
      toLabel.value = 'To';
      toLabel.font = { size: 9, italic: true };

      const endCell = worksheet.getCell(1, colOffset + 23);
      endCell.value = lastDay;
      endCell.numFmt = 'DD-MMM-YYYY';
      endCell.font = { size: 9 };
    });

    // ── ROW 2: Column Headers ─────────────────────────────
    MACHINES.forEach((_, mIdx) => {
      const colOffset = mIdx * MACHINE_COL_OFFSET;
      HEADERS.forEach((header, hIdx) => {
        const cell = worksheet.getCell(2, colOffset + hIdx + 1);
        cell.value = header;
        cell.font = { bold: true, size: 9 };
        cell.fill = {
          type: 'pattern', pattern: 'solid',
          fgColor: { argb: 'FFCFE2F3' }
        };
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
      });

      // Gap columns styling
      if (mIdx < 3) {
        for (let g = 1; g <= 2; g++) {
          const gapCell = worksheet.getCell(2, colOffset + 25 + g);
          gapCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        }
      }
    });

    worksheet.getRow(2).height = 32;

    // ── GROUP DATA: date → machine → shift ────────────────
    const grouped = new Map<string, Map<string, Map<string, JobRow[]>>>();

    for (const job of monthJobs) {
      const d = new Date(job.createdAt);
      const dateStr = d.toISOString().split('T')[0];
      const { shift } = getShift(d);
      const machine = job.machineName;

      if (!grouped.has(dateStr)) grouped.set(dateStr, new Map());
      const byMachine = grouped.get(dateStr)!;
      if (!byMachine.has(machine)) byMachine.set(machine, new Map());
      const byShift = byMachine.get(machine)!;
      if (!byShift.has(shift)) byShift.set(shift, []);
      byShift.get(shift)!.push(job);
    }

    const sortedDates = Array.from(grouped.keys()).sort();
    let currentRow = 3;

    for (const dateStr of sortedDates) {
      const byMachine = grouped.get(dateStr)!;
      const date = new Date(dateStr + 'T00:00:00');
      const dayName = DAYS[date.getDay()];

      // Get downtime for this date
      const dtForDate = downtimeMap.get(dateStr);

      // Determine which shifts have activity
      const allShifts = new Set<string>();
      for (const [, shiftMap] of byMachine) {
        for (const shift of shiftMap.keys()) allShifts.add(shift);
      }
      allShifts.add('I'); // Always show at least shift I
      const sortedShifts = Array.from(allShifts).sort((a, b) => {
        const order: Record<string, number> = { 'I': 0, 'II': 1, 'III': 2 };
        return (order[a] ?? 3) - (order[b] ?? 3);
      });

      let isFirstRowForDate = true;

      for (const shift of sortedShifts) {
        MACHINES.forEach((machineName, mIdx) => {
          const colOffset = mIdx * MACHINE_COL_OFFSET;
          const shiftJobs = byMachine.get(machineName)?.get(shift) ?? [];

          // Aggregate production numbers
          const ok = shiftJobs.reduce((s, j) => s + (j.okParts || 0), 0);
          const cr = shiftJobs.reduce((s, j) => s + (j.castingRejection || 0), 0);
          const mr = shiftJobs.reduce((s, j) => s + (j.machineRejection || 0), 0);
          const rw = shiftJobs.reduce((s, j) => s + (j.rework || 0), 0);
          const total = ok + cr + mr + rw;

          // Most common component
          const componentCounts = new Map<string, number>();
          shiftJobs.forEach(j => {
            componentCounts.set(j.componentName, (componentCounts.get(j.componentName) || 0) + 1);
          });
          const component = shiftJobs.length > 0
            ? [...componentCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
            : '-';

          const operator = shiftJobs.length > 0 ? shiftJobs[0].operatorName : '';
          const cycleTime = CYCLE_TIMES[component] ?? 10;
          const loadUnload = 1;
          const shiftHours = 8;
          const norms = total > 0 ? calcNorms(cycleTime, loadUnload, shiftHours) : 0;
          const efficiency = norms > 0 ? total / norms : 0;

          // Downtime for this machine on this date (spread evenly if only shift I has data)
          const machDt = dtForDate?.get(machineName);
          const breakdownMins = (shift === 'I' && machDt) ? machDt.breakdown : 0;
          const powerCutMins = (shift === 'I' && machDt) ? machDt.powerCut : 0;
          const setupMins = (shift === 'I' && machDt) ? machDt.setup : 0;

          // Helper to set cell with styling
          const setCell = (colIdx: number, value: unknown, fmt?: Partial<ExcelJS.Style>) => {
            const cell = worksheet.getCell(currentRow, colOffset + colIdx + 1);
            cell.value = value as ExcelJS.CellValue;
            cell.border = {
              top: { style: 'hair' }, bottom: { style: 'hair' },
              left: { style: 'thin' }, right: { style: 'thin' }
            };
            cell.font = { size: 10 };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            if (fmt) Object.assign(cell, fmt);
          };

          // Date & Day — only on first row of date, first machine
          if (mIdx === 0) {
            if (isFirstRowForDate) {
              setCell(0, date);
              worksheet.getCell(currentRow, colOffset + 1).numFmt = 'DD-MMM-YY';
              setCell(1, dayName);
            } else {
              setCell(0, null);
              setCell(1, null);
            }
          }

          // Shift, Time In/Out
          setCell(2, shift);
          setCell(3, shift === 'I' ? 8 : shift === 'II' ? 16 : 0);
          setCell(4, shift === 'I' ? 16 : shift === 'II' ? 24 : 8);

          if (shiftJobs.length === 0) {
            // Empty shift
            setCell(5, '');
            setCell(6, '-');
            for (let i = 7; i <= 24; i++) setCell(i, null);
          } else {
            setCell(5, operator);
            setCell(6, component);
            setCell(7, cycleTime);
            setCell(8, loadUnload);
            setCell(9, parseFloat(norms.toFixed(1)));
            setCell(10, ok || null);
            setCell(11, cr || null);
            setCell(12, mr || null);
            setCell(13, rw || null);
            setCell(14, total);

            // OK parts green highlight
            if (ok > 0) {
              worksheet.getCell(currentRow, colOffset + 11).font = { size: 10, bold: true, color: { argb: 'FF28A745' } };
            }
            // Defects red highlight
            if (cr + mr > 0) {
              [12, 13].forEach(ci => {
                const v = ci === 12 ? cr : mr;
                if (v > 0) worksheet.getCell(currentRow, colOffset + ci).font = { size: 10, color: { argb: 'FFDC3545' } };
              });
            }

            setCell(15, setupMins || null);    // Setting Time
            setCell(16, breakdownMins || null); // Machine Breakdown
            setCell(17, powerCutMins || null);  // Power cut off
            setCell(18, null);                  // Vehicle loading
            setCell(19, null);                  // No Operator
            setCell(20, null);                  // No Load
            setCell(21, null);                  // Other

            // % column
            const effCell = worksheet.getCell(currentRow, colOffset + 23);
            effCell.value = parseFloat(efficiency.toFixed(4));
            effCell.numFmt = '0%';
            effCell.border = { top: { style: 'hair' }, bottom: { style: 'hair' }, left: { style: 'thin' }, right: { style: 'thin' } };
            effCell.font = { size: 10, bold: efficiency >= 0.95 };
            if (efficiency >= 0.95) {
              effCell.font = { size: 10, bold: true, color: { argb: 'FF28A745' } };
            } else if (efficiency < 0.7) {
              effCell.font = { size: 10, color: { argb: 'FFDC3545' } };
            }

            setCell(23, null); // Status
            setCell(24, null); // Remark
          }
        });

        isFirstRowForDate = false;
        currentRow++;
      }
    }

    // ── Column Widths ─────────────────────────────────────
    MACHINES.forEach((_, mIdx) => {
      const c = mIdx * MACHINE_COL_OFFSET;
      worksheet.getColumn(c + 1).width = 11;   // Date
      worksheet.getColumn(c + 2).width = 5;    // Day
      worksheet.getColumn(c + 3).width = 5;    // Shift
      worksheet.getColumn(c + 4).width = 6;    // Time In
      worksheet.getColumn(c + 5).width = 6;    // Time Out
      worksheet.getColumn(c + 6).width = 15;   // Operator
      worksheet.getColumn(c + 7).width = 20;   // Component
      worksheet.getColumn(c + 8).width = 7;    // Cycle Time
      worksheet.getColumn(c + 9).width = 7;    // L/U
      worksheet.getColumn(c + 10).width = 7;   // Norms
      worksheet.getColumn(c + 11).width = 6;   // OK
      worksheet.getColumn(c + 12).width = 5;   // CR
      worksheet.getColumn(c + 13).width = 5;   // MR
      worksheet.getColumn(c + 14).width = 5;   // R/W
      worksheet.getColumn(c + 15).width = 6;   // Total
      for (let i = 16; i <= 22; i++) worksheet.getColumn(c + i).width = 9;
      worksheet.getColumn(c + 23).width = 6;   // %
      worksheet.getColumn(c + 24).width = 7;   // Status
      worksheet.getColumn(c + 25).width = 10;  // Remark
      // Gap columns
      if (mIdx < 3) {
        worksheet.getColumn(c + 26).width = 2;
        worksheet.getColumn(c + 27).width = 2;
      }
    });

    // Freeze rows
    worksheet.views = [{ state: 'frozen', ySplit: 2, xSplit: 0 }];
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
