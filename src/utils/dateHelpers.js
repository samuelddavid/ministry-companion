import { addWeeks } from 'date-fns';

export function getNextOccurrence(dayIndex, time) {
  const now = new Date();
  const [h, m] = time.split(':').map(Number);
  let date = new Date(now);
  date.setHours(h, m, 0, 0);
  const diff = (dayIndex - now.getDay() + 7) % 7;
  if (diff === 0 && date <= now) return addWeeks(date, 1);
  date.setDate(date.getDate() + diff);
  return date;
}

export function minutesToHM(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
