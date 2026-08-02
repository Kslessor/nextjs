'use client';

// Focus-person tree: grandparents / parents / focus + spouse(s) / children.
// Boxes are HTML buttons (keyboard-focusable) over an SVG connector layer,
// inside a pan/zoom canvas. Cards carry an avatar and a generation hue;
// clicking any card re-centres the tree on that person.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  bloodRelativeIds,
  computeGenerations,
  displayName,
  familyById,
  genHue,
  initials,
  lifespan,
  personById,
} from '@/lib/data';
import type { FamilyData, Person } from '@/lib/types';

const BOX_W = 196;
const BOX_H = 78;
const H_GAP = 26;
const GROUP_GAP = 56;
const ROW_GAP = 84;
const PAD = 16;

interface Box {
  person: Person;
  x: number;
  y: number;
}

interface Line {
  kind: 'marriage' | 'child';
  points: [number, number][];
  knot?: [number, number];
}

interface Layout {
  width: number;
  height: number;
  boxes: Box[];
  lines: Line[];
}

function rowY(row: number) {
  return PAD + row * (BOX_H + ROW_GAP);
}

function groupWidth(n: number) {
  return n * BOX_W + Math.max(0, n - 1) * H_GAP;
}

function layoutRow(groups: Person[][], row: number, totalWidth: number): Box[][] {
  const rowWidth =
    groups.reduce((acc, g) => acc + groupWidth(g.length), 0) +
    Math.max(0, groups.length - 1) * GROUP_GAP;
  let x = (totalWidth - rowWidth) / 2;
  const out: Box[][] = [];
  for (const g of groups) {
    const boxes: Box[] = [];
    for (const p of g) {
      boxes.push({ person: p, x, y: rowY(row) });
      x += BOX_W + H_GAP;
    }
    x += GROUP_GAP - H_GAP;
    out.push(boxes);
  }
  return out;
}

function midBottom(b: Box): [number, number] {
  return [b.x + BOX_W / 2, b.y + BOX_H];
}
function midTop(b: Box): [number, number] {
  return [b.x + BOX_W / 2, b.y];
}

function dropTo(from: [number, number], to: [number, number]): [number, number][] {
  const midY = (from[1] + to[1]) / 2;
  return [from, [from[0], midY], [to[0], midY], to];
}

function computeLayout(data: FamilyData, focus: Person): Layout {
  const parentsFam = familyById(data, focus.parents);
  const father = personById(data, parentsFam?.husband);
  const mother = personById(data, parentsFam?.wife);

  const gpOf = (p?: Person): Person[] => {
    if (!p) return [];
    const f = familyById(data, p.parents);
    if (!f) return [];
    return [personById(data, f.husband), personById(data, f.wife)].filter(
      (x): x is Person => !!x
    );
  };
  const paternalGP = gpOf(father);
  const maternalGP = gpOf(mother);

  const spouseFams = focus.spouseFamilies
    .map((fid) => familyById(data, fid))
    .filter((f): f is NonNullable<typeof f> => !!f);
  const spouses = spouseFams.map((f) =>
    personById(data, f.husband === focus.id ? f.wife : f.husband)
  );

  const childGroups = spouseFams.map((f) =>
    f.children.map((cid) => personById(data, cid)).filter((x): x is Person => !!x)
  );

  const parentsGroup = [father, mother].filter((x): x is Person => !!x);
  const focusGroup = [focus, ...spouses.filter((x): x is Person => !!x)];

  const rowWidths = [
    (paternalGP.length ? groupWidth(paternalGP.length) : 0) +
      (maternalGP.length ? groupWidth(maternalGP.length) : 0) +
      (paternalGP.length && maternalGP.length ? GROUP_GAP : 0),
    groupWidth(parentsGroup.length),
    groupWidth(focusGroup.length),
    childGroups.reduce((acc, g) => acc + (g.length ? groupWidth(g.length) : 0), 0) +
      Math.max(0, childGroups.filter((g) => g.length).length - 1) * GROUP_GAP,
  ];
  const width = Math.max(...rowWidths, BOX_W) + PAD * 2;

  const boxes: Box[] = [];
  const lines: Line[] = [];

  const gpGroups = [paternalGP, maternalGP].filter((g) => g.length);
  const gpLaid = layoutRow(gpGroups, 0, width);
  const [parentsLaid = []] = layoutRow(parentsGroup.length ? [parentsGroup] : [], 1, width);
  const [focusLaid = []] = layoutRow([focusGroup], 2, width);
  const childLaid = layoutRow(childGroups.filter((g) => g.length), 3, width);

  gpLaid.forEach((g) => boxes.push(...g));
  boxes.push(...parentsLaid, ...focusLaid);
  childLaid.forEach((g) => boxes.push(...g));

  let gpIndex = 0;
  for (const parent of [father, mother]) {
    if (!parent) continue;
    const gps = gpOf(parent);
    if (!gps.length) continue;
    const laid = gpLaid[gpIndex++];
    if (!laid) continue;
    let source: [number, number];
    if (laid.length === 2) {
      const y = laid[0].y + BOX_H / 2;
      const x1 = laid[0].x + BOX_W;
      const x2 = laid[1].x;
      const knotX = (x1 + x2) / 2;
      lines.push({ kind: 'marriage', points: [[x1, y], [x2, y]], knot: [knotX, y] });
      source = [knotX, y + 10];
    } else {
      source = midBottom(laid[0]);
    }
    const parentBox = parentsLaid.find((b) => b.person.id === parent.id);
    if (parentBox) lines.push({ kind: 'child', points: dropTo(source, midTop(parentBox)) });
  }

  const focusBox = focusLaid[0];
  if (parentsLaid.length) {
    let source: [number, number];
    if (parentsLaid.length === 2) {
      const y = parentsLaid[0].y + BOX_H / 2;
      const x1 = parentsLaid[0].x + BOX_W;
      const x2 = parentsLaid[1].x;
      const knotX = (x1 + x2) / 2;
      lines.push({ kind: 'marriage', points: [[x1, y], [x2, y]], knot: [knotX, y] });
      source = [knotX, y + 10];
    } else {
      source = midBottom(parentsLaid[0]);
    }
    lines.push({ kind: 'child', points: dropTo(source, midTop(focusBox)) });
  }

  let laidChildIdx = 0;
  spouseFams.forEach((fam, i) => {
    const spouseBox = focusLaid[i + 1];
    let knot: [number, number] | null = null;
    if (spouseBox) {
      if (i === 0) {
        const y = focusBox.y + BOX_H / 2;
        const x1 = focusBox.x + BOX_W;
        const x2 = spouseBox.x;
        knot = [(x1 + x2) / 2, y];
        lines.push({ kind: 'marriage', points: [[x1, y], [x2, y]], knot });
      } else {
        const y = focusBox.y + BOX_H + 14 + (i - 1) * 10;
        const from = midBottom(focusBox);
        const to = midBottom(spouseBox);
        knot = [(from[0] + to[0]) / 2, y];
        lines.push({
          kind: 'marriage',
          points: [from, [from[0], y], [to[0], y], to],
          knot,
        });
      }
    }
    const group = fam.children.length ? childLaid[laidChildIdx++] : undefined;
    if (!group || !group.length) return;
    const source: [number, number] = knot
      ? [knot[0], knot[1] + 10]
      : midBottom(focusBox);
    const busY = group[0].y - ROW_GAP / 2;
    const xs = group.map((b) => b.x + BOX_W / 2);
    const busX1 = Math.min(...xs, source[0]);
    const busX2 = Math.max(...xs, source[0]);
    lines.push({ kind: 'child', points: [source, [source[0], busY]] });
    lines.push({ kind: 'child', points: [[busX1, busY], [busX2, busY]] });
    for (const b of group) {
      lines.push({ kind: 'child', points: [[b.x + BOX_W / 2, busY], midTop(b)] });
    }
  });

  const height = rowY(3) + BOX_H + PAD;
  return { width, height, boxes, lines };
}

function PersonBox({
  box,
  isFocus,
  marriedIn,
  gen,
  onFocus,
}: {
  box: Box;
  isFocus: boolean;
  marriedIn: boolean;
  gen: number | undefined;
  onFocus: (id: string) => void;
}) {
  const p = box.person;
  const life = lifespan(p);
  const hue = genHue(gen);
  return (
    <button
      type="button"
      className={`tree-box absolute flex items-center gap-2.5 text-left rounded-lg px-3 border bg-white overflow-hidden ${
        isFocus
          ? 'border-brass shadow-[0_0_0_1px_#1e5b41]'
          : marriedIn
          ? 'border-dashed border-line'
          : 'border-line'
      } hover:border-brass focus-visible:border-brass`}
      style={{ left: box.x, top: box.y, width: BOX_W, height: BOX_H }}
      onClick={() => onFocus(p.id)}
      aria-label={`${displayName(p)}${life ? `, ${life}` : ''}${
        isFocus ? ' (focused)' : ''
      }`}
      aria-current={isFocus ? 'true' : undefined}
    >
      {p.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.photo}
          alt=""
          className="h-9 w-9 rounded-full object-cover shrink-0 border border-line"
        />
      ) : (
        <span
          className="h-9 w-9 rounded-full shrink-0 grid place-items-center text-[12px] font-semibold"
          style={{ background: hue.bg, color: hue.fg }}
          aria-hidden="true"
        >
          {initials(p)}
        </span>
      )}
      <span className="min-w-0">
        <span className="block font-display text-[14.5px] leading-tight truncate">
          {displayName(p)}
        </span>
        <span className="block font-mono text-[10px] text-muted mt-0.5">
          {life || ' '}
          {gen ? <span className="ml-1.5" style={{ color: hue.fg }}>G{gen}</span> : null}
        </span>
      </span>
    </button>
  );
}

const ZOOMS = [0.5, 0.65, 0.8, 1, 1.2, 1.5];

export default function Tree({
  data,
  focusId,
  onFocus,
}: {
  data: FamilyData;
  focusId: string;
  onFocus: (id: string) => void;
}) {
  const focus = personById(data, focusId);
  const layout = useMemo(
    () => (focus ? computeLayout(data, focus) : null),
    [data, focus]
  );
  const blood = useMemo(() => bloodRelativeIds(data, focusId), [data, focusId]);
  const gens = useMemo(() => computeGenerations(data), [data]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const drag = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);

  const fit = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !layout) return;
    const s = Math.min(1.5, (el.clientWidth - 16) / layout.width);
    setScale(Math.max(0.4, Math.round(s * 100) / 100));
  }, [layout]);

  // Keep the focused person in view — matters most on phones.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !layout) return;
    const focusBox = layout.boxes.find((b) => b.person.id === focusId);
    if (!focusBox) return;
    const stageLeft = Math.max(0, (el.clientWidth - layout.width * scale) / 2);
    el.scrollLeft = stageLeft + (focusBox.x + BOX_W / 2) * scale - el.clientWidth / 2;
  }, [layout, focusId, scale]);

  if (!focus || !layout) return <p className="text-muted p-6">Person not found.</p>;

  const zoomStep = (dir: 1 | -1) => {
    const idx = ZOOMS.findIndex((z) => z >= scale - 0.01);
    const next = ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, (idx < 0 ? 3 : idx) + dir))];
    setScale(next);
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <button
          type="button"
          onClick={() => zoomStep(-1)}
          aria-label="Zoom out"
          className="h-8 w-8 grid place-items-center rounded-md border border-line hover:border-brass"
        >
          −
        </button>
        <span className="font-mono text-xs text-muted w-11 text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => zoomStep(1)}
          aria-label="Zoom in"
          className="h-8 w-8 grid place-items-center rounded-md border border-line hover:border-brass"
        >
          +
        </button>
        <button
          type="button"
          onClick={fit}
          className="h-8 px-3 rounded-md border border-line text-sm hover:border-brass"
        >
          Fit
        </button>
        <span className="ml-auto hidden sm:block text-[11px] text-muted">
          Drag to pan · click a person to re-centre
        </span>
      </div>

      <div
        ref={scrollRef}
        className="overflow-auto rounded-xl border border-line bg-[#fbfbfa] cursor-grab active:cursor-grabbing"
        role="group"
        aria-label="Family tree"
        style={{ maxHeight: '72vh' }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          const el = scrollRef.current!;
          drag.current = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
          el.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const el = scrollRef.current!;
          el.scrollLeft = drag.current.sl - (e.clientX - drag.current.x);
          el.scrollTop = drag.current.st - (e.clientY - drag.current.y);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <div
          className="mx-auto"
          style={{ width: layout.width * scale, height: layout.height * scale }}
        >
          <div
            className="relative"
            style={{
              width: layout.width,
              height: layout.height,
              transform: `scale(${scale})`,
              transformOrigin: '0 0',
            }}
          >
            <svg
              className="absolute inset-0 pointer-events-none"
              width={layout.width}
              height={layout.height}
              aria-hidden="true"
            >
              {layout.lines.map((line, i) => (
                <g key={i}>
                  <polyline
                    points={line.points.map(([x, y]) => `${x},${y}`).join(' ')}
                    fill="none"
                    stroke={line.kind === 'marriage' ? '#2e7d5b' : '#b8c4bd'}
                    strokeWidth={line.kind === 'marriage' ? 1.5 : 1}
                  />
                  {line.knot && (
                    <rect
                      x={line.knot[0] - 4}
                      y={line.knot[1] - 4}
                      width={8}
                      height={8}
                      fill="#ffffff"
                      stroke="#2e7d5b"
                      strokeWidth={1.5}
                      transform={`rotate(45 ${line.knot[0]} ${line.knot[1]})`}
                    />
                  )}
                </g>
              ))}
            </svg>
            {layout.boxes.map((box) => (
              <PersonBox
                key={box.person.id}
                box={box}
                isFocus={box.person.id === focusId}
                marriedIn={!blood.has(box.person.id)}
                gen={gens.get(box.person.id)}
                onFocus={onFocus}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
