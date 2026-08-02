'use client';

import { useEffect, useMemo, useState } from 'react';
import Filters from '@/components/Filters';
import Profile from '@/components/Profile';
import Search from '@/components/Search';
import SuggestModal, { type SuggestMode } from '@/components/SuggestModal';
import Tree from '@/components/Tree';
import { getAdapter } from '@/lib/adapter';
import { personById } from '@/lib/data';
import type { FamilyData } from '@/lib/types';

export default function TreePage() {
  const adapter = useMemo(() => getAdapter(), []);
  const [data, setData] = useState<FamilyData | null>(null);
  const [error, setError] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [modal, setModal] = useState<SuggestMode | null>(null);

  useEffect(() => {
    adapter
      .loadData()
      .then((d) => {
        setData(d);
        // deep link from the places map: /tree/?focus=I5
        const wanted = new URLSearchParams(window.location.search).get('focus');
        setFocusId(wanted && personById(d, wanted) ? wanted : d.meta.rootPersonId);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load data'));
  }, [adapter]);

  const focus = data && focusId ? personById(data, focusId) : undefined;
  const [showFilters, setShowFilters] = useState(false);

  return (
    <main className="min-h-screen">
      <header className="bg-brass text-white px-4 py-3 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto">
          <a href="../" className="hover:opacity-90">
            <span className="font-display text-xl sm:text-2xl block leading-tight">
              The Ajai · Rotimi Family
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/70">
              {data ? `${data.people.length} people · ${data.families.length} families` : 'family tree'}
            </span>
          </a>
        </h1>
        <nav className="flex items-center gap-4 text-sm">
          <a href="../" className="text-white/80 hover:text-white">
            Places map
          </a>
        </nav>
        {data && <Search data={data} onSelect={setFocusId} dark />}
      </header>

      {error && (
        <p role="alert" className="p-6 text-red-600">
          {error}
        </p>
      )}
      {!data && !error && <p className="p-6 text-muted">Loading the family…</p>}

      {data && focus && (
        <div className="grid lg:grid-cols-[236px_minmax(0,1fr)_360px] gap-4 p-4 items-start">
          <aside aria-label="Explore">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="lg:hidden w-full border border-line rounded-md px-3 py-2 text-sm text-left mb-2"
              aria-expanded={showFilters}
            >
              {showFilters ? '▾' : '▸'} Explore &amp; filter
            </button>
            <div className={`${showFilters ? 'block' : 'hidden'} lg:block bg-card border border-line rounded-xl p-4`}>
              <Filters data={data} onSelect={(id) => setFocusId(id)} />
            </div>
          </aside>
          <section aria-label="Tree" className="min-w-0">
            <Tree data={data} focusId={focus.id} onFocus={setFocusId} />
          </section>
          <Profile
            data={data}
            person={focus}
            onFocus={setFocusId}
            onSuggestEdit={() => setModal('edit')}
            onAddRelative={() => setModal('add')}
          />
        </div>
      )}

      {data && focus && (
        <div className="px-4 pb-6">
          <button
            type="button"
            onClick={() => setModal('report')}
            className="text-xs text-muted hover:text-brass underline underline-offset-2"
          >
            Something wrong on this page? Report it.
          </button>
        </div>
      )}

      <footer className="border-t border-line px-4 py-3 flex justify-between text-[11px] text-muted">
        <span>
          {data
            ? `${data.people.length} people · ${data.families.length} families · rev ${
                data.meta.revision ?? 0
              }`
            : ''}
        </span>
        <a href="../console/" className="hover:text-brass">
          Family console
        </a>
      </footer>

      {data && focus && modal && (
        <SuggestModal
          data={data}
          target={focus}
          mode={modal}
          delivery={adapter.mode === 'apps-script' ? 'queued' : 'download'}
          onClose={() => setModal(null)}
          onSubmit={async (sug) => {
            await adapter.submitSuggestion(sug);
          }}
        />
      )}
    </main>
  );
}
