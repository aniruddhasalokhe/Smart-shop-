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
const COL_OFFSET = 27; // columns per machine block (25 data + 2 gap)
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const HEADERS = [
  'Date', 'Day', 'Shift', 'Time In', 'Time Out',
  'Oprator Name', 'Component Name', 'Cycle Time', 'loading/\nunloading', 'Norms',
  'OK', 'CR', 'MR', 'R/W', 'Total',
  'Setting\nTime', 'Machine\nBreak\ndawn', 'Power\ncut off',
  'Vehicle\nloading/unloading', 'No\nOprato', 'No\nLoad', 'Other',
  '%', 'Status', 'Remark'
];

// Column widths matching the original
const COL_WIDTHS = [
  9, 5, 4, 6, 6,           // Date, Day, Shift, Time In, Time Out
  14, 18, 6, 6, 6,         // Operator, Component, CycleTime, L/U, Norms
  5, 5, 5, 5, 6,           // OK, CR, MR, R/W, Total
  6, 8, 7, 8, 6, 5, 6,    // Setting, Breakdown, PowerCut, Vehicle, NoOp, NoLoad, Other
  6, 7, 10                 // %, Status, Remark
];

// Colors matching the original screenshots
const COLORS = {
  titleBg:    'FFD9EAD3', // Light green for title row
  headerBg:   'FFCFE2F3', // Light blue for headers
  yellowBg:   'FFFFFF00', // Yellow for OK, Total, % cols
  pinkBg:     'FFFF9999', // Pink for breakdown/power cut values
  greenBg:    'FF92D050', // Green for good efficiency
  redBg:      'FFFF6666', // Red for bad efficiency
  lightYellow:'FFFFFFCC', // Light yellow for total=0
};

// Thin border style
const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' }, bottom: { style: 'thin' },
  left: { style: 'thin' }, right: { style: 'thin' }
};
const hairBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'hair' }, bottom: { style: 'hair' },
  left: { style: 'thin' }, right: { style: 'thin' }
};

// Default cycle times per component
const CYCLE_TIMES: Record<string, number> = {
  'QTF 90 Body 1st': 12, 'QTF 90 Body 4th Axis': 15, 'QTF 90 Body M10 Tap': 8,
  'QTF 100 1st': 14, 'QTF 100 4th Axis': 16, 'QTF 100 M10 Tap': 9,
  'QTF 80 Body 1st': 11, 'Maintop': 10, 'Maintop 2nd': 10,
  'Front Cover 2176': 10.5, 'Front Cover 2176 2nd': 9, 'Front Cover 29001 2nd': 11,
  'Hanger': 7, '1 HP Dome': 6, '0.5 HP Dome': 5.5,
  'Pipe Bracket 3rd': 8, 'APM Bracket': 7.5,
  'V B T Cover': 9, 'V B T Cover 1st': 9,
  'Yoke 140 Full': 18, 'Yoke 140 1st': 12, 'Yoke 140 2nd': 13,
  'Bracket 020': 8, 'Bracket 099': 8.5,
};

function getShift(date: Date): 'I' | 'II' | 'III' {
  const hour = date.getHours();
  if (hour >= 8 && hour < 16) return 'I';
  if (hour >= 16 && hour < 24) return 'II';
  return 'III';
}

// Number of rows per day (matching original: 3 shifts + 3 blank = ~6 rows)
const ROWS_PER_DAY = 6;

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

  const sortedMonths = Array.from(byMonth.keys()).sort();

  for (const monthKey of sortedMonths) {
    const monthJobs = byMonth.get(monthKey)!;
    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const monthName = MONTH_NAMES[month];
    const shortYear = String(year).substring(2);

    // Sheet naming matching original: "April 25", "May 25", "June 25", "Aug 25", "sep .25", etc
    let sheetName: string;
    if (month === 8) sheetName = `sep .${shortYear}`;  // September special
    else if (['April', 'May', 'June', 'July'].includes(monthName)) sheetName = `${monthName} ${shortYear}`;
    else sheetName = `${monthName.substring(0, 3)} ${shortYear}`;

    const worksheet = workbook.addWorksheet(sheetName);

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // ══════════════════════════════════════════════════════════
    //  ROW 1: TITLE ROW (for each machine block)
    // ══════════════════════════════════════════════════════════
    MACHINES.forEach((machineName, mIdx) => {
      const c = mIdx * COL_OFFSET;

      // Title merged across first ~10 cols
      worksheet.mergeCells(1, c + 1, 1, c + 10);
      const titleCell = worksheet.getCell(1, c + 1);
      titleCell.value = `Daily Production report ${machineName}`;
      titleCell.font = { bold: true, size: 11 };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.titleBg } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Month label
      const monthCell = worksheet.getCell(1, c + 15);
      monthCell.value = monthName;
      monthCell.font = { bold: true, size: 10 };

      // Date range
      const fromCell = worksheet.getCell(1, c + 18);
      fromCell.value = `01-${String(month + 1).padStart(2, '0')}-${year}`;
      fromCell.font = { size: 9 };

      const toLabel = worksheet.getCell(1, c + 20);
      toLabel.value = 'To';

      const endCell = worksheet.getCell(1, c + 22);
      endCell.value = `${lastDay.getDate()}-${String(month + 1).padStart(2, '0')}-${year}`;
      endCell.font = { size: 9 };
    });
    worksheet.getRow(1).height = 20;

    // ══════════════════════════════════════════════════════════
    //  ROW 2: COLUMN HEADERS (green/blue background)
    // ══════════════════════════════════════════════════════════
    MACHINES.forEach((_, mIdx) => {
      const c = mIdx * COL_OFFSET;
      HEADERS.forEach((header, hIdx) => {
        const cell = worksheet.getCell(2, c + hIdx + 1);
        cell.value = header;
        cell.font = { bold: true, size: 8 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
        cell.border = thinBorder;
        cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
      });
    });
    worksheet.getRow(2).height = 36;

    // Set column widths
    MACHINES.forEach((_, mIdx) => {
      const c = mIdx * COL_OFFSET;
      COL_WIDTHS.forEach((w, i) => {
        worksheet.getColumn(c + i + 1).width = w;
      });
      // Gap columns
      if (mIdx < 3) {
        worksheet.getColumn(c + 26).width = 1.5;
        worksheet.getColumn(c + 27).width = 1.5;
      }
    });

    // ══════════════════════════════════════════════════════════
    //  GROUP DATA: date → machine → shift
    // ══════════════════════════════════════════════════════════
    const grouped = new Map<string, Map<string, Map<string, JobRow[]>>>();
    for (const job of monthJobs) {
      const d = new Date(job.createdAt);
      const dateStr = d.toISOString().split('T')[0];
      const shift = getShift(d);
      const machine = job.machineName;
      if (!grouped.has(dateStr)) grouped.set(dateStr, new Map());
      const byMachine = grouped.get(dateStr)!;
      if (!byMachine.has(machine)) byMachine.set(machine, new Map());
      const byShift = byMachine.get(machine)!;
      if (!byShift.has(shift)) byShift.set(shift, []);
      byShift.get(shift)!.push(job);
    }

    // Get all dates in this month that have any data
    const allDatesInMonth: string[] = [];
    const daysInMonth = lastDay.getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      const ds = dt.toISOString().split('T')[0];
      if (grouped.has(ds)) allDatesInMonth.push(ds);
    }

    let rowNum = 3; // Start after headers

    for (const dateStr of allDatesInMonth) {
      const byMachine = grouped.get(dateStr)!;
      const date = new Date(dateStr + 'T00:00:00');
      const dayName = DAYS[date.getDay()];
      const dtForDate = downtimeMap.get(dateStr);

      const SHIFTS: ('I' | 'II' | 'III')[] = ['I', 'II', 'III'];
      const SHIFT_TIMES: Record<string, { timeIn: number; timeOut: number }> = {
        'I': { timeIn: 8.00, timeOut: 8.00 },
        'II': { timeIn: 8.00, timeOut: 8.00 },
        'III': { timeIn: 8.00, timeOut: 8.00 },
      };

      // Write ROWS_PER_DAY rows (3 shifts + 3 blanks, matching original)
      for (let rowIdx = 0; rowIdx < ROWS_PER_DAY; rowIdx++) {
        const isShiftRow = rowIdx < 3;
        const shift = isShiftRow ? SHIFTS[rowIdx] : null;

        MACHINES.forEach((machineName, mIdx) => {
          const c = mIdx * COL_OFFSET;

          // Helper: set cell with value and styling
          const set = (colIdx: number, value: unknown, extra?: {
            fill?: string; font?: Partial<ExcelJS.Font>; numFmt?: string;
          }) => {
            const cell = worksheet.getCell(rowNum, c + colIdx + 1);
            cell.value = value as ExcelJS.CellValue;
            cell.border = hairBorder;
            cell.font = { size: 10, ...(extra?.font || {}) };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            if (extra?.fill) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: extra.fill } };
            }
            if (extra?.numFmt) cell.numFmt = extra.numFmt;
          };

          // Date & Day — only on first row, first machine block
          if (mIdx === 0 && rowIdx === 0) {
            set(0, date, { numFmt: 'DD-MMM' });
            set(1, dayName);
          } else if (mIdx === 0) {
            set(0, null);
            set(1, null);
          }

          if (!isShiftRow || !shift) {
            // Blank row — just fill in borders and time columns
            set(2, null);
            if (rowIdx === 3) {
              // Extra row with time values (matching original pattern)
              set(3, 8.00, { numFmt: '0.00' });
              set(4, 8.00, { numFmt: '0.00' });
            } else {
              set(3, null);
              set(4, null);
            }
            for (let i = 5; i <= 9; i++) set(i, null);
            // OK, CR, MR, R/W columns — just borders
            set(10, null, { fill: COLORS.yellowBg });
            set(11, null);
            set(12, null);
            set(13, null);
            set(14, 0, { fill: COLORS.yellowBg }); // Total = 0
            for (let i = 15; i <= 21; i++) set(i, null);
            set(22, null);
            set(23, null);
            set(24, null);
            return;
          }

          // ── SHIFT DATA ROW ────────────────────────────
          const shiftJobs = byMachine.get(machineName)?.get(shift) ?? [];

          set(2, shift);
          set(3, SHIFT_TIMES[shift].timeIn, { numFmt: '0.00' });
          set(4, SHIFT_TIMES[shift].timeOut, { numFmt: '0.00' });

          if (shiftJobs.length === 0) {
            // Empty shift — dashes
            set(5, null);
            set(6, null);
            set(7, '-', { font: { size: 10, color: { argb: 'FF999999' } } });
            set(8, '-', { font: { size: 10, color: { argb: 'FF999999' } } });
            set(9, '-', { font: { size: 10, color: { argb: 'FF999999' } } });
            set(10, null, { fill: COLORS.yellowBg });
            set(11, null);
            set(12, null);
            set(13, null);
            set(14, 0, { fill: COLORS.yellowBg });
            for (let i = 15; i <= 21; i++) set(i, null);
            set(22, '-', { fill: COLORS.pinkBg });
            set(23, null);
            set(24, null);
            return;
          }

          // Aggregate production
          const ok = shiftJobs.reduce((s, j) => s + (j.okParts || 0), 0);
          const cr = shiftJobs.reduce((s, j) => s + (j.castingRejection || 0), 0);
          const mr = shiftJobs.reduce((s, j) => s + (j.machineRejection || 0), 0);
          const rw = shiftJobs.reduce((s, j) => s + (j.rework || 0), 0);
          const total = ok + cr + mr + rw;

          // Most common component & operator
          const compCounts = new Map<string, number>();
          shiftJobs.forEach(j => compCounts.set(j.componentName, (compCounts.get(j.componentName) || 0) + 1));
          const component = Array.from(compCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];
          const operator = shiftJobs[0].operatorName;

          const cycleTime = CYCLE_TIMES[component] ?? 10.5;
          const loadUnload = 1;
          const norms = (8 * 60) / (cycleTime + loadUnload);
          const efficiency = norms > 0 ? Math.round((total / norms) * 100) : 0;

          // Downtime for this machine/date (assign to shift I only)
          const machDt = dtForDate?.get(machineName);
          const breakdownMins = (shift === 'I' && machDt) ? machDt.breakdown : 0;
          const powerCutMins = (shift === 'I' && machDt) ? machDt.powerCut : 0;
          const setupMins = (shift === 'I' && machDt) ? machDt.setup : 0;

          set(5, operator);
          set(6, component);
          set(7, cycleTime, { font: { bold: true } });
          set(8, loadUnload, { font: { bold: true } });
          set(9, parseFloat(norms.toFixed(1)), { font: { bold: true } });

          // OK — yellow background
          set(10, ok || null, { fill: COLORS.yellowBg });

          // CR — pink if > 0
          set(11, cr || null, { fill: cr > 0 ? COLORS.pinkBg : undefined });

          // MR — pink if > 0
          set(12, mr || null, { fill: mr > 0 ? COLORS.pinkBg : undefined });

          // R/W
          set(13, rw || null);

          // Total — yellow background
          set(14, total, { fill: COLORS.yellowBg, font: { bold: true } });

          // Loss columns
          set(15, setupMins || null);
          set(16, breakdownMins || null, { fill: breakdownMins > 0 ? COLORS.pinkBg : undefined });
          set(17, powerCutMins || null, { fill: powerCutMins > 0 ? COLORS.pinkBg : undefined });
          set(18, null); // Vehicle
          set(19, null); // No Operator
          set(20, null); // No Load
          set(21, null); // Other

          // % — colored based on value
          let effFill = COLORS.pinkBg;
          if (efficiency >= 90) effFill = COLORS.greenBg;
          else if (efficiency >= 70) effFill = COLORS.yellowBg;
          set(22, `${efficiency}%`, { fill: effFill, font: { bold: true } });

          // Status & Remark
          set(23, null);
          set(24, null);
        });

        rowNum++;
      }
    }

    // Freeze top 2 rows
    worksheet.views = [{ state: 'frozen', ySplit: 2, xSplit: 0 }];
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
