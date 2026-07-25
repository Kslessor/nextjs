'use client';

// Focus-person tree: grandparents / parents / focus + spouse(s) / children.
// Boxes are HTML buttons (keyboard-focusable); connectors are an SVG layer
// underneath. Clicking any box re-centres the tree on that person.

import { useMemo } from 'react';
import {
  bloodRelativeIds,
  displayName,
  familyById,
  lifespan,
  personById,
} from '@/lib/data';
import type { FamilyData, Person } from '@/lib/types';

const BOX_W = 172;
const BOX_H = 74;
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

// Orthogonal drop from a point down to the top of a box.
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

  // Row 0: grandparents
  const gpGroups = [paternalGP, maternalGP].filter((g) => g.length);
  const gpLaid = layoutRow(gpGroups, 0, width);
  // Row 1: parents
  const [parentsLaid = []] = layoutRow(parentsGroup.length ? [parentsGroup] : [], 1, width);
  // Row 2: focus + spouses
  const [focusLaid = []] = layoutRow([focusGroup], 2, width);
  // Row 3: children, grouped per family
  const childLaid = layoutRow(childGroups.filter((g) => g.length), 3, width);

  gpLaid.forEach((g) => boxes.push(...g));
  boxes.push(...parentsLaid, ...focusLaid);
  childLaid.forEach((g) => boxes.push(...g));

  // Couple ties + drops for grandparents -> parents
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

  // Parents tie + drop to focus
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

  // Focus marriages + drops to each family's children
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
        // later marriages route under the boxes between
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
  onFocus,
}: {
  box: Box;
  isFocus: boolean;
  marriedIn: boolean;
  onFocus: (id: string) => void;
}) {
  const p = box.person;
  const life = lifespan(p);
  const base =
    'tree-box absolute text-left rounded-md px-3 py-2 border overflow-hidden';
  const skin = isFocus
    ? 'bg-card border-brass'
    : marriedIn
    ? 'bg-marriedin border-dashed border-line'
    : p.sex === 'F'
    ? 'bg-[#1a2238] border-line'
    : 'bg-[#13233b] border-line';
  return (
    <button
      type="button"
      className={`${base} ${skin} hover:border-brass focus-visible:border-brass`}
      style={{ left: box.x, top: box.y, width: BOX_W, height: BOX_H }}
      onClick={() => onFocus(p.id)}
      aria-label={`${displayName(p)}${life ? `, ${life}` : ''}${
        isFocus ? ' (focused)' : ''
      }`}
      aria-current={isFocus ? 'true' : undefined}
    >
      <div className="font-display text-[15px] leading-tight truncate">
        {p.given || 'Unknown'}
      </div>
      <div className="surname-caps text-[11px] text-muted truncate">
        {p.surname?.toLowerCase() || ''}
      </div>
      <div className="font-mono text-[10px] text-muted mt-0.5">{life}</div>
    </button>
  );
}

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

  if (!focus || !layout) return <p className="text-muted p-6">Person not found.</p>;

  return (
    <div className="overflow-auto" role="group" aria-label="Family tree">
      <div
        className="relative mx-auto"
        style={{ width: layout.width, height: layout.height }}
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
                stroke={line.kind === 'marriage' ? '#d9a441' : '#3d5a7d'}
                strokeWidth={line.kind === 'marriage' ? 1.5 : 1}
              />
              {line.knot && (
                <rect
                  x={line.knot[0] - 4}
                  y={line.knot[1] - 4}
                  width={8}
                  height={8}
                  fill="#0d1522"
                  stroke="#d9a441"
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
            onFocus={onFocus}
          />
        ))}
      </div>
    </div>
  );
}
