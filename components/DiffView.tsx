'use client';

// Before → after comparison for a suggestion. Current record on the left,
// proposed on the right, changed fields highlighted.

import { displayName, familyById, formatEvent, personById } from '@/lib/data';
import type {
  AddPersonPayload,
  AddRelationshipPayload,
  EditPayload,
  EventInfo,
  FamilyData,
  Person,
  ReportErrorPayload,
  Suggestion,
} from '@/lib/types';

function show(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object' && value !== null && 'date' in (value as object)) {
    return formatEvent(value as EventInfo) || '—';
  }
  return String(value);
}

const FIELD_LABELS: Record<string, string> = {
  given: 'Given names',
  surname: 'Surname',
  sex: 'Sex',
  title: 'Title',
  suffix: 'Suffix',
  nickname: 'Nickname',
  epithet: 'Remembered as',
  birth: 'Birth',
  christening: 'Christening',
  death: 'Death',
  burial: 'Burial',
  causeOfDeath: 'Cause of death',
  ageAtDeath: 'Age at death',
  story: 'Story',
  photo: 'Photo',
};

function DiffTable({
  rows,
}: {
  rows: { label: string; before: string; after: string; changed: boolean }[];
}) {
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="font-mono text-[10px] uppercase tracking-wider text-muted">
          <th className="text-left font-normal pb-1 w-32">Field</th>
          <th className="text-left font-normal pb-1">Current</th>
          <th className="text-left font-normal pb-1">Proposed</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-t border-line/40 align-top">
            <td className="py-1.5 pr-2 font-mono text-[11px] text-muted">{r.label}</td>
            <td className="py-1.5 pr-3 text-muted">{r.before}</td>
            <td className={`py-1.5 ${r.changed ? 'text-brass' : ''}`}>{r.after}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function relationText(
  data: FamilyData,
  target: Person,
  payload: AddPersonPayload | AddRelationshipPayload
) {
  const fam = payload.familyId ? familyById(data, payload.familyId) : undefined;
  const withSpouse =
    fam &&
    personById(data, fam.husband === target.id ? fam.wife : fam.husband);
  const base = `${payload.relation} of ${displayName(target)} (${target.id})`;
  return withSpouse ? `${base}, with ${displayName(withSpouse)}` : base;
}

export default function DiffView({ data, sug }: { data: FamilyData; sug: Suggestion }) {
  const target = personById(data, sug.targetId);

  if (!target) {
    return (
      <p className="text-red-400 text-sm">
        Target {sug.targetId} does not exist in the current data — this suggestion
        cannot be applied.
      </p>
    );
  }

  if (sug.type === 'edit') {
    const fields = (sug.payload as EditPayload).fields ?? {};
    const rows = Object.keys(fields).map((key) => ({
      label: FIELD_LABELS[key] ?? key,
      before: show((target as unknown as Record<string, unknown>)[key]),
      after: show((fields as unknown as Record<string, unknown>)[key]),
      changed: true,
    }));
    return rows.length ? (
      <DiffTable rows={rows} />
    ) : (
      <p className="text-muted text-sm">No field changes.</p>
    );
  }

  if (sug.type === 'addPerson') {
    const payload = sug.payload as AddPersonPayload;
    const person = payload.person ?? {};
    const rows = Object.entries(person)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([key, v]) => ({
        label: FIELD_LABELS[key] ?? key,
        before: '—',
        after: show(v),
        changed: true,
      }));
    return (
      <div>
        <p className="text-sm mb-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted mr-2">
            New person, attaching as
          </span>
          <span className="text-brass">{relationText(data, target, payload)}</span>
        </p>
        <DiffTable rows={rows} />
      </div>
    );
  }

  if (sug.type === 'addRelationship') {
    const payload = sug.payload as AddRelationshipPayload;
    const other = personById(data, payload.otherId);
    return (
      <p className="text-sm">
        Link <span className="text-brass">{other ? displayName(other) : payload.otherId}</span>{' '}
        as <span className="text-brass">{relationText(data, target, payload)}</span>
      </p>
    );
  }

  return (
    <p className="text-sm whitespace-pre-wrap">
      {(sug.payload as ReportErrorPayload).note}
    </p>
  );
}
