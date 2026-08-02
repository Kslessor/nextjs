'use client';

// Explore sidebar: generation chips, surname + place filters, and the list
// of matching people. Clicking a person re-centres the tree on them.

import { useMemo, useState } from 'react';
import {
  computeGenerations,
  displayName,
  genHue,
  lifespan,
} from '@/lib/data';
import { computePins, personPlaceKeys } from '@/lib/places';
import type { FamilyData } from '@/lib/types';

const LIST_LIMIT = 60;

export default function Filters({
  data,
  onSelect,
}: {
  data: FamilyData;
  onSelect: (id: string) => void;
}) {
  const gens = useMemo(() => computeGenerations(data), [data]);
  const maxGen = useMemo(() => {
    let m = 1;
    gens.forEach((g) => { if (g > m) m = g; });
    return m;
  }, [gens]);

  const surnames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of data.people) {
      const s = (p.surname || '').trim().toUpperCase();
      if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const pins = useMemo(() => computePins(data), [data]);
  const placeKeysByPerson = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const p of data.people) m.set(p.id, personPlaceKeys(p));
    return m;
  }, [data]);

  const [gen, setGen] = useState<number | null>(null);
  const [surname, setSurname] = useState('');
  const [place, setPlace] = useState('');

  const filtered = useMemo(
    () =>
      data.people.filter((p) => {
        if (gen !== null && gens.get(p.id) !== gen) return false;
        if (surname && (p.surname || '').trim().toUpperCase() !== surname) return false;
        if (place && !(placeKeysByPerson.get(p.id) ?? []).includes(place)) return false;
        return true;
      }),
    [data, gen, surname, place, gens, placeKeysByPerson]
  );
  const anyFilter = gen !== null || surname !== '' || place !== '';

  const label = 'font-mono text-[10px] uppercase tracking-[0.14em] text-muted';
  const select =
    'mt-1 w-full bg-white border border-line rounded-md px-2.5 py-2 text-sm';

  return (
    <div className="space-y-5">
      <div>
        <div className={label}>Generation</div>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {Array.from({ length: maxGen }, (_, i) => i + 1).map((g) => {
            const hue = genHue(g);
            const on = gen === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGen(on ? null : g)}
                aria-pressed={on}
                className="rounded-full px-2.5 py-1 text-xs font-semibold border"
                style={
                  on
                    ? { background: hue.fg, borderColor: hue.fg, color: '#fff' }
                    : { background: hue.bg, borderColor: hue.bg, color: hue.fg }
                }
              >
                G{g}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className={label}>Surname</span>
        <select className={select} value={surname} onChange={(e) => setSurname(e.target.value)}>
          <option value="">All surnames</option>
          {surnames.map(([s, n]) => (
            <option key={s} value={s}>
              {s} ({n})
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={label}>Place</span>
        <select className={select} value={place} onChange={(e) => setPlace(e.target.value)}>
          <option value="">All places</option>
          {pins.map((pin) => (
            <option key={pin.key} value={pin.key}>
              {pin.label} ({pin.people.length})
            </option>
          ))}
        </select>
      </label>

      <div>
        <div className={label}>In view</div>
        <div className="font-display text-3xl text-brass leading-none mt-1">
          {filtered.length}
        </div>
        <div className="text-[11px] text-muted mt-0.5">
          {anyFilter ? 'matching your filters' : 'everyone on record'}
        </div>
        {anyFilter && (
          <button
            type="button"
            onClick={() => { setGen(null); setSurname(''); setPlace(''); }}
            className="mt-2 text-xs text-brass underline underline-offset-2"
          >
            Reset filters
          </button>
        )}
      </div>

      {anyFilter && (
        <ul className="border-t border-line pt-3 space-y-0.5 max-h-72 overflow-auto">
          {filtered.slice(0, LIST_LIMIT).map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className="w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-marriedin"
              >
                <span className="font-display">{displayName(p)}</span>{' '}
                <span className="font-mono text-[10px] text-muted">{lifespan(p)}</span>
              </button>
            </li>
          ))}
          {filtered.length > LIST_LIMIT && (
            <li className="px-2 py-1 text-[11px] text-muted">
              …and {filtered.length - LIST_LIMIT} more — narrow the filters to see them.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
