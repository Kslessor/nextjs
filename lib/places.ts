// Turns the free-text places recorded in the data into map pins.
// Place strings from the PAF export are matched against a curated gazetteer,
// so newly approved records light up on the map automatically when their
// place text matches. Unmatched places are simply not pinned.

import { displayName } from './data';
import type { FamilyData, Person } from './types';

export interface PlaceDef {
  key: string;
  label: string;
  country: string;
  lat: number;
  lng: number;
  patterns: RegExp[];
}

// Ordered: more specific patterns first.
const GAZETTEER: PlaceDef[] = [
  { key: 'ara-ikole', label: 'Ara-Ikole, Ekiti', country: 'Nigeria', lat: 7.79, lng: 5.51,
    patterns: [/ARA[ -]?IKOLE/i, /IKOLE[, ]+EKITI/i, /ODO ARA/i, /OKE ARA/i, /OKE[ -]?ETA/i, /ODO IRERUN/i, /ILASO/i, /OKE-ORIN/i, /OKE-IJEBU/i, /IJESHA[ -]?ISU/i, /ISANPAKUNDE/i] },
  { key: 'igbemo', label: 'Igbemo, Ekiti', country: 'Nigeria', lat: 7.65, lng: 5.35,
    patterns: [/IGBEMO/i] },
  { key: 'lagos', label: 'Lagos', country: 'Nigeria', lat: 6.52, lng: 3.37,
    patterns: [/LAGOS/i, /EBUTE ?META/i, /AGEGE/i] },
  { key: 'abeokuta', label: 'Abeokuta', country: 'Nigeria', lat: 7.15, lng: 3.35,
    patterns: [/ABEOKUTA/i, /OKE IGBORE/i] },
  { key: 'ifo', label: 'Ifo, Ogun', country: 'Nigeria', lat: 6.82, lng: 3.19,
    patterns: [/\bIFO\b/i] },
  { key: 'ilorin', label: 'Ilorin, Kwara', country: 'Nigeria', lat: 8.5, lng: 4.55,
    patterns: [/ILORIN/i] },
  { key: 'blackburn', label: 'Blackburn, Lancashire', country: 'England', lat: 53.75, lng: -2.48,
    patterns: [/BLACKBURN|BLACBURN/i] },
  { key: 'preston', label: 'Preston, Lancashire', country: 'England', lat: 53.76, lng: -2.7,
    patterns: [/PRESTON/i] },
  { key: 'skelmersdale', label: 'Skelmersdale', country: 'England', lat: 53.55, lng: -2.77,
    patterns: [/SKELME?[RS]DALE/i] },
  { key: 'warrington', label: 'Warrington', country: 'England', lat: 53.39, lng: -2.6,
    patterns: [/WARRINGTON/i] },
  { key: 'bradford', label: 'Bradford', country: 'England', lat: 53.8, lng: -1.75,
    patterns: [/BRADFORD/i] },
  { key: 'hemel', label: 'Hemel Hempstead', country: 'England', lat: 51.75, lng: -0.45,
    patterns: [/HEMEL/i] },
  { key: 'london', label: 'Croydon, London', country: 'England', lat: 51.37, lng: -0.1,
    patterns: [/CROYDON|LONDON/i] },
  { key: 'edinburgh', label: 'Edinburgh', country: 'Scotland', lat: 55.95, lng: -3.19,
    patterns: [/EDINBUR/i] },
  { key: 'emmen', label: 'Emmen', country: 'Netherlands', lat: 52.78, lng: 6.9,
    patterns: [/EMMEN|EMMERCOMPASCUUM/i] },
  { key: 'turkey', label: 'Turkey', country: 'Turkey', lat: 39.0, lng: 35.0,
    patterns: [/TURKEY/i] },
  { key: 'sydney', label: 'Sydney, NSW', country: 'Australia', lat: -33.87, lng: 151.21,
    patterns: [/SYDNEY|FRESHWATER/i] },
];

export interface PlacePerson {
  id: string;
  name: string;
  events: string[]; // e.g. ["born 1942", "died 2007"]
}

export interface Pin extends PlaceDef {
  people: PlacePerson[];
}

const EVENT_LABELS: [keyof Person, string][] = [
  ['birth', 'born'],
  ['christening', 'christened'],
  ['death', 'died'],
  ['burial', 'buried'],
];

function matchPlace(place: string | null | undefined): PlaceDef | undefined {
  if (!place) return undefined;
  return GAZETTEER.find((g) => g.patterns.some((re) => re.test(place)));
}

// Which gazetteer places does this person's record touch? (for filtering)
export function personPlaceKeys(person: Person): string[] {
  const keys = new Set<string>();
  for (const [field] of EVENT_LABELS) {
    const ev = person[field] as { place: string | null } | null;
    const def = matchPlace(ev?.place);
    if (def) keys.add(def.key);
  }
  return Array.from(keys);
}

export function computePins(data: FamilyData): Pin[] {
  const byKey = new Map<string, Pin>();
  for (const person of data.people) {
    const seenHere = new Set<string>();
    for (const [field, label] of EVENT_LABELS) {
      const ev = person[field] as { date: string | null; place: string | null } | null;
      if (!ev?.place) continue;
      const def = matchPlace(ev.place);
      if (!def) continue;
      let pin = byKey.get(def.key);
      if (!pin) {
        pin = { ...def, people: [] };
        byKey.set(def.key, pin);
      }
      const evText = label + (ev.date ? ` ${ev.date.slice(0, 4)}` : '');
      if (seenHere.has(def.key)) {
        pin.people[pin.people.length - 1].events.push(evText);
      } else {
        seenHere.add(def.key);
        pin.people.push({ id: person.id, name: displayName(person), events: [evText] });
      }
    }
  }
  return Array.from(byKey.values()).sort((a, b) => b.people.length - a.people.length);
}
