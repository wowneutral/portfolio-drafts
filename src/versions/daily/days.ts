// Seven flat weekday colours, one family of printed stock. Paper ink on every one passes AA
// (contrast with #fff6ec: soot 14.8, cobalt 8.7, green 7.4, plum 9.3, ochre 6.1, vermilion 5.2, teal 7.2).
export const DAYS = [
  { name: 'Sunday', c: '#24221f' },
  { name: 'Monday', c: '#1f3f9e' },
  { name: 'Tuesday', c: '#1d5c3c' },
  { name: 'Wednesday', c: '#6a2b5a' },
  { name: 'Thursday', c: '#8a4f0c' },
  { name: 'Friday', c: '#c4301c' },
  { name: 'Saturday', c: '#0e5c63' },
] as const;

const pad = (n: number) => String(n).padStart(2, '0');
export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const real = (iso: string) => new Date(iso + 'T12:00:00').getDay();

// Dev only: ?day=0..6 forces today's weekday so all seven colours can be checked.
const forced = import.meta.env.DEV && typeof location !== 'undefined' ? new URLSearchParams(location.search).get('day') : null;
const shift = forced !== null && /^[0-6]$/.test(forced) ? +forced - real(todayISO()) : 0;

export const dayIndex = (iso: string) => (((real(iso) + shift) % 7) + 7) % 7;
export const colorOf = (iso: string) => DAYS[dayIndex(iso)].c;
export const dayName = (iso: string) => DAYS[real(iso)].name;
export const colorAfter = (iso: string, k: number) => DAYS[(dayIndex(iso) + k) % 7].c;
