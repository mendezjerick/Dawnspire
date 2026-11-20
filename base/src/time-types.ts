export type EntryKind = 'regular' | 'overtime';
export type DayStatus = 'unavailable' | 'sick';
export type LiveState = 'in' | 'overtime' | 'out' | 'unavailable' | 'sick' | 'not-in';
export type Entry = { id: number; kind: EntryKind; startAt: string; endAt: string | null; endedBy: string | null };
export type Gate = { enabled: true } | { enabled: false; reason: string };

export type Today = {
  now: string;
  date: string;
  status: DayStatus | null;
  openBar: { kind: EntryKind; startAt: string } | null;
  entries: Entry[];
  totals: { regularMs: number; overtimeMs: number; weekRegularMs: number; weekOvertimeMs: number };
  actions: { timeIn: Gate; timeOut: Gate; overtime: Gate; overtimeOpen: boolean };
};

export type BoardPerson = { id: number; name: string; role: string; state: LiveState; since: string | null };

export type GridDay = { date: string; status: DayStatus | null; regularMs: number; overtimeMs: number; flags: string[]; worked: boolean; entries?: Entry[] };
export type Grid = { today: string; from: string; to: string; days: string[]; people: Array<{ id: number; name: string; days: GridDay[] }> };

export const STATE_LABEL: Record<LiveState, string> = {
  in: 'In', overtime: 'Overtime', out: 'Out', unavailable: 'Unavailable', sick: 'Sick', 'not-in': 'Not in yet',
};
