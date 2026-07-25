import type { EventInfo, Family, FamilyData, Person } from './types';

// Accept both dataset shapes: people/families as arrays, or as id-keyed
// objects (the shape the PAF extraction produced). Normalised to arrays.
export function normalizeData(raw: unknown): FamilyData {
  const d = raw as {
    meta?: FamilyData['meta'];
    schemaVersion?: number;
    people: Person[] | Record<string, Person>;
    families: Family[] | Record<string, Family>;
  };
  if (!d || !d.people || !d.families || !d.meta) {
    throw new Error('Not a family-data file (missing meta/people/families)');
  }
  return {
    meta: {
      ...(d.schemaVersion !== undefined ? { schemaVersion: d.schemaVersion } : {}),
      ...d.meta,
    },
    people: Array.isArray(d.people) ? d.people : Object.values(d.people),
    families: Array.isArray(d.families) ? d.families : Object.values(d.families),
  };
}

export function personById(data: FamilyData, id: string | null | undefined): Person | undefined {
  if (!id) return undefined;
  return data.people.find((p) => p.id === id);
}

export function familyById(data: FamilyData, id: string | null | undefined): Family | undefined {
  if (!id) return undefined;
  return data.families.find((f) => f.id === id);
}

export function displayName(p: Person | undefined | null): string {
  if (!p) return 'Unknown';
  const parts = [p.given, p.surname].filter(Boolean);
  return parts.length ? parts.join(' ') : 'Unknown';
}

export function fullName(p: Person): string {
  return [p.title, p.given, p.surname, p.suffix].filter(Boolean).join(' ');
}

export function formatEvent(e: EventInfo | null | undefined): string {
  if (!e || (!e.date && !e.place)) return '';
  const date = e.date ? (e.approx ? `abt ${e.date}` : e.date) : '';
  return [date, e.place].filter(Boolean).join(' · ');
}

export function lifespan(p: Person): string {
  const b = p.birth?.date ? p.birth.date.slice(0, 4) : null;
  const d = p.death?.date ? p.death.date.slice(0, 4) : null;
  if (!b && !d) return '';
  return `${b ?? '?'} – ${d ?? (isLiving(p) ? '' : '?')}`;
}

function isLiving(p: Person): boolean {
  return !p.death && !p.burial;
}

export function parentsOf(data: FamilyData, p: Person): { father?: Person; mother?: Person; family?: Family } {
  const fam = familyById(data, p.parents);
  if (!fam) return {};
  return {
    family: fam,
    father: personById(data, fam.husband),
    mother: personById(data, fam.wife),
  };
}

export function siblingsOf(data: FamilyData, p: Person): Person[] {
  const fam = familyById(data, p.parents);
  if (!fam) return [];
  return fam.children
    .filter((id) => id !== p.id)
    .map((id) => personById(data, id))
    .filter((x): x is Person => !!x);
}

export function spousesOf(data: FamilyData, p: Person): { spouse: Person | undefined; family: Family }[] {
  return p.spouseFamilies
    .map((fid) => familyById(data, fid))
    .filter((f): f is Family => !!f)
    .map((f) => ({
      family: f,
      spouse: personById(data, f.husband === p.id ? f.wife : f.husband),
    }));
}

export function childrenOf(data: FamilyData, p: Person): { child: Person; family: Family }[] {
  const out: { child: Person; family: Family }[] = [];
  for (const fid of p.spouseFamilies) {
    const fam = familyById(data, fid);
    if (!fam) continue;
    for (const cid of fam.children) {
      const c = personById(data, cid);
      if (c) out.push({ child: c, family: fam });
    }
  }
  return out;
}

// A person is "married-in" relative to a focus person when their only link to
// the focus is via a spouse family (they are a spouse, and not a blood relative
// reachable through parent/child links from the focus).
export function bloodRelativeIds(data: FamilyData, focusId: string): Set<string> {
  const seen = new Set<string>();
  const queue = [focusId];
  while (queue.length) {
    const id = queue.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const p = personById(data, id);
    if (!p) continue;
    // walk up
    const fam = familyById(data, p.parents);
    if (fam) {
      for (const next of [fam.husband, fam.wife]) if (next && !seen.has(next)) queue.push(next);
    }
    // walk down
    for (const fid of p.spouseFamilies) {
      const sf = familyById(data, fid);
      if (sf) for (const c of sf.children) if (!seen.has(c)) queue.push(c);
    }
  }
  return seen;
}

export function searchPeople(data: FamilyData, q: string, limit = 12): Person[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const scored = data.people
    .map((p) => {
      const name = [p.given, p.surname, p.nickname, p.title].filter(Boolean).join(' ').toLowerCase();
      const idx = name.indexOf(needle);
      return { p, idx, starts: name.startsWith(needle) };
    })
    .filter((x) => x.idx >= 0)
    .sort((a, b) => (a.starts === b.starts ? a.idx - b.idx : a.starts ? -1 : 1));
  return scored.slice(0, limit).map((x) => x.p);
}

export function nextId(prefix: 'I' | 'F', data: FamilyData): string {
  let max = 0;
  const list = prefix === 'I' ? data.people.map((p) => p.id) : data.families.map((f) => f.id);
  for (const id of list) {
    const m = id.match(/^([A-Z]+)(\d+)$/);
    if (m && m[1] === prefix) max = Math.max(max, parseInt(m[2], 10));
  }
  return `${prefix}${max + 1}`;
}

export function emptyEvent(): EventInfo {
  return { date: null, approx: false, place: null };
}

export function blankPerson(id: string): Person {
  return {
    id,
    given: null,
    surname: null,
    sex: null,
    title: null,
    suffix: null,
    nickname: null,
    epithet: null,
    birth: null,
    christening: null,
    death: null,
    burial: null,
    causeOfDeath: null,
    ageAtDeath: null,
    story: null,
    photo: null,
    parents: null,
    spouseFamilies: [],
  };
}
