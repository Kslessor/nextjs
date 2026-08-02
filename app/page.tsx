'use client';

// Front page: the family's places across the world. The proverb is the
// header; the map is the hero.

import { useEffect, useMemo, useState } from 'react';
import Search from '@/components/Search';
import WorldMap from '@/components/WorldMap';
import { getAdapter } from '@/lib/adapter';
import { computePins } from '@/lib/places';
import type { FamilyData } from '@/lib/types';

function goToPerson(id: string) {
  window.location.href = `tree/?focus=${encodeURIComponent(id)}`;
}

export default function Home() {
  const adapter = useMemo(() => getAdapter(), []);
  const [data, setData] = useState<FamilyData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adapter
      .loadData()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load data'));
  }, [adapter]);

  const pins = useMemo(() => (data ? computePins(data) : []), [data]);
  const countries = new Set(pins.map((p) => p.country)).size;

  return (
    <main className="min-h-screen">
      <header className="border-b border-line px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="font-display text-xl mr-auto">
          Ajai <span className="text-brass">·</span> Rotimi
        </span>
        <nav className="flex items-center gap-4 text-sm">
          <a href="tree/" className="text-muted hover:text-brass">
            Family tree
          </a>
        </nav>
        {data && <Search data={data} onSelect={goToPerson} />}
      </header>

      <section className="max-w-5xl mx-auto px-4 pt-10 pb-6 text-center">
        <h1 className="font-display text-3xl sm:text-5xl leading-tight [text-wrap:balance]">
          Odò tí ó bá gbàgbé orísun rẹ̀ á gbẹ
        </h1>
        <p className="mt-3 text-muted italic">
          “A river that forgets its source will dry up.”
        </p>
        <p className="mt-5 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          The Ajai and Rotimi family — from{' '}
          <span className="text-brass">Ara-Ikole, Ekiti, Nigeria</span> to England,
          Scotland, the Netherlands, Turkey and Australia. Every pin below is a place
          where our family was born, married, lived or was laid to rest.
        </p>

        {data && (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
            {[
              [data.people.length, 'people'],
              [data.families.length, 'families'],
              [pins.length, 'places'],
              [countries, 'countries'],
            ].map(([n, label]) => (
              <div key={label} className="bg-card border border-line rounded-xl py-4">
                <div className="font-display text-3xl text-brass">{n}</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted mt-1">
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-10" aria-label="Family places map">
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        {!data && !error && <p className="text-muted">Loading the family…</p>}
        {data && <WorldMap data={data} onSelectPerson={goToPerson} />}

        <div className="mt-8 text-center">
          <a
            href="tree/"
            className="inline-block bg-brass text-white rounded-md px-6 py-3 font-medium hover:opacity-90"
          >
            Explore the family tree →
          </a>
          <p className="mt-3 text-xs text-muted">
            Click any pin to see who belongs to that place, or search a name above.
          </p>
        </div>
      </section>

      <footer className="border-t border-line px-4 py-3 flex justify-between text-[11px] text-muted">
        <span>
          {data
            ? `${data.people.length} people · ${data.families.length} families · rev ${
                data.meta.revision ?? 0
              }`
            : ''}
        </span>
        <a href="console/" className="hover:text-brass">
          Family console
        </a>
      </footer>
    </main>
  );
}
