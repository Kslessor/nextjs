'use client';

// World map with a pin for every place the family's recorded events touch.
// The land outline is embedded (no map service needed). Pins scale with the
// number of people; clicking one opens the list of family members there.

import { useEffect, useMemo, useRef, useState } from 'react';
import land from './world-land.json';
import { computePins, type Pin } from '@/lib/places';
import type { FamilyData } from '@/lib/types';

const W = 1000;
const H = 500;
// The interesting part of the world for this family: trim Antarctica and
// the far north so the map fills the frame.
const VIEW = { x: 60, y: 60, w: 880, h: 330 };

function px(lng: number) {
  return ((lng + 180) / 360) * W;
}
function py(lat: number) {
  return ((90 - lat) / 180) * H;
}

export default function WorldMap({
  data,
  onSelectPerson,
}: {
  data: FamilyData;
  onSelectPerson: (id: string) => void;
}) {
  const pins = useMemo(() => computePins(data), [data]);
  const [active, setActive] = useState<Pin | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const maxCount = Math.max(...pins.map((p) => p.people.length), 1);
  const frameRef = useRef<HTMLDivElement>(null);

  // On phones the frame scrolls sideways — start it centred on the pins
  // (between Nigeria and the UK), not on the empty Atlantic.
  useEffect(() => {
    const el = frameRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const homeX = ((px(2) - VIEW.x) / VIEW.w) * el.scrollWidth;
    el.scrollLeft = homeX - el.clientWidth / 2;
  }, []);

  return (
    <div>
      <div ref={frameRef} className="relative border border-line rounded-xl bg-card overflow-x-auto">
        {/* min-width keeps pins tappable on phones; the frame scrolls sideways */}
        <svg
          viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
          className="w-full h-auto block min-w-[680px]"
          role="img"
          aria-label="World map of family places"
        >
          <path d={land.d} fill="#edeae3" stroke="#d8d4ca" strokeWidth="0.6" />
          {pins.map((pin) => {
            const r = 4 + 8 * Math.sqrt(pin.people.length / maxCount);
            const x = px(pin.lng);
            const y = py(pin.lat);
            const isActive = active?.key === pin.key || hover === pin.key;
            return (
              <g
                key={pin.key}
                transform={`translate(${x} ${y})`}
                className="cursor-pointer"
                onMouseEnter={() => setHover(pin.key)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setActive(active?.key === pin.key ? null : pin)}
              >
                <circle r={r + 6} fill="transparent" />
                <circle
                  r={r}
                  fill={isActive ? '#1e5b41' : 'rgba(30, 91, 65, 0.75)'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="pin-dot"
                />
                <text
                  y={-r - 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={600}
                  fill="#1c2635"
                  stroke="#ffffff"
                  strokeWidth="3"
                  paintOrder="stroke"
                  style={{ pointerEvents: 'none', opacity: isActive || r > 8 ? 1 : 0 }}
                >
                  {pin.label.split(',')[0]} · {pin.people.length}
                </text>
              </g>
            );
          })}
        </svg>
        {/* keyboard access to the same pins */}
        <div className="sr-only">
          {pins.map((pin) => (
            <button key={pin.key} type="button" onClick={() => setActive(pin)}>
              {pin.label}, {pin.people.length} people
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3" role="list" aria-label="Places">
        {pins.map((pin) => (
          <button
            key={pin.key}
            type="button"
            onClick={() => setActive(active?.key === pin.key ? null : pin)}
            className={`rounded-full border px-3 py-1 text-xs ${
              active?.key === pin.key
                ? 'border-brass bg-brass text-white'
                : 'border-line text-ink hover:border-brass'
            }`}
          >
            {pin.label}
            <span className={active?.key === pin.key ? 'opacity-80' : 'text-muted'}>
              {' '}
              · {pin.people.length}
            </span>
          </button>
        ))}
      </div>

      {active && (
        <div className="mt-4 bg-card border border-line rounded-xl p-5">
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <h3 className="font-display text-xl">
              {active.label}
              <span className="text-muted font-sans text-sm ml-2">{active.country}</span>
            </h3>
            <button
              type="button"
              onClick={() => setActive(null)}
              className="text-xs text-muted hover:text-brass"
            >
              close
            </button>
          </div>
          <p className="text-xs text-muted mb-3">
            {active.people.length} family member{active.people.length === 1 ? '' : 's'} with
            recorded events here
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {active.people.map((p) => (
              <li key={p.id} className="flex items-baseline gap-2">
                <button
                  type="button"
                  onClick={() => onSelectPerson(p.id)}
                  className="text-brass hover:underline text-left"
                >
                  {p.name}
                </button>
                <span className="font-mono text-[10px] text-muted whitespace-nowrap">
                  {p.events.join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
