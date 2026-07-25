'use client';

import { useEffect, useRef, useState } from 'react';
import { displayName, lifespan, searchPeople } from '@/lib/data';
import type { FamilyData } from '@/lib/types';

export default function Search({
  data,
  onSelect,
}: {
  data: FamilyData;
  onSelect: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const results = searchPeople(data, q);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (id: string) => {
    onSelect(id);
    setQ('');
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-xs">
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && results[active]) {
            e.preventDefault();
            pick(results[active].id);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder="Search a name…"
        aria-label="Search people by name"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="search-results"
        className="w-full bg-marriedin border border-line rounded-md px-3 py-2 text-sm placeholder:text-muted"
      />
      {open && results.length > 0 && (
        <ul
          id="search-results"
          role="listbox"
          className="absolute z-30 mt-1 w-full bg-card border border-line rounded-md shadow-xl max-h-80 overflow-auto"
        >
          {results.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-marriedin ${
                  i === active ? 'bg-marriedin' : ''
                }`}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(p.id)}
              >
                <span className="font-display">{displayName(p)}</span>{' '}
                <span className="font-mono text-[11px] text-muted">{lifespan(p)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
