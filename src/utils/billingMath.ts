/**
 * Adds N months to a date, clamping to the last day of the month if necessary.
 * e.g. Jan 31 + 1 month = Feb 28 (or 29)
 */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== date.getDate()) {
    d.setDate(0);
  }
  return d;
}

/**
 * Calculates the start and end date for a specific billing period index.
 * Period 0 starts on intakeDate.
 */
export function getBillingPeriod(intakeDateStr: string, periodIndex: number): { start: Date; end: Date } {
  const intakeDate = new Date(intakeDateStr);
  const start = addMonths(intakeDate, periodIndex);
  
  // End date is start date + 1 month - 1 millisecond (or just treat as open interval)
  // For display/logic, usually [Start, End) or [Start, End] depending on convention.
  // Here we use [Start, Start + 1 Month)
  const end = addMonths(start, 1);
  
  return { start, end };
}

/**
 * Determines which periods need to be billed up to 'asOfDate'.
 */
export function calculateBillablePeriods(
  intakeDateStr: string, 
  lastBilledIndex: number, 
  asOfDateStr: string
): number[] {
  const intakeDate = new Date(intakeDateStr);
  const asOfDate = new Date(asOfDateStr);
  const periods: number[] = [];
  
  let nextIndex = lastBilledIndex + 1;
  
  // Safety break to prevent infinite loops in bad data
  while (nextIndex < 1000) {
    const { start } = getBillingPeriod(intakeDateStr, nextIndex);
    if (start <= asOfDate) {
      periods.push(nextIndex);
      nextIndex++;
    } else {
      break;
    }
  }
  
  return periods;
}
