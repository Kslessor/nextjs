'use client';

// "Suggest an edit" / "Add a relative" / "Report a problem" — all produce a
// structured Suggestion that goes to the pending queue (or a downloadable
// file in zero-backend mode). Nothing here writes to the tree.

import { useEffect, useRef, useState } from 'react';
import { displayName, spousesOf } from '@/lib/data';
import { normalizeDate, sanitizeMultiline, sanitizePhoto, sanitizeText } from '@/lib/sanitize';
import type {
  EventInfo,
  FamilyData,
  Person,
  Relation,
  Suggestion,
  SuggestionPayload,
} from '@/lib/types';

export type SuggestMode = 'edit' | 'add' | 'report';

interface EventDraft {
  date: string;
  place: string;
}

interface PersonDraft {
  given: string;
  surname: string;
  sex: '' | 'M' | 'F';
  title: string;
  suffix: string;
  nickname: string;
  epithet: string;
  birth: EventDraft;
  christening: EventDraft;
  death: EventDraft;
  burial: EventDraft;
  causeOfDeath: string;
  ageAtDeath: string;
  story: string;
  photo: string; // data URI (from the resize step) or https URL, '' = none
}

// Downscale a chosen image in the browser so suggestions stay small.
async function fileToDataUri(file: File): Promise<string> {
  if (file.size > 15 * 1024 * 1024) throw new Error('Please choose a photo under 15 MB.');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('That file does not look like an image.'));
      img.src = url;
    });
    const scale = Math.min(1, 640 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function draftFromPerson(p?: Person): PersonDraft {
  const ev = (e: EventInfo | null | undefined): EventDraft => ({
    date: e?.date ?? '',
    place: e?.place ?? '',
  });
  return {
    given: p?.given ?? '',
    surname: p?.surname ?? '',
    sex: p?.sex ?? '',
    title: p?.title ?? '',
    suffix: p?.suffix ?? '',
    nickname: p?.nickname ?? '',
    epithet: p?.epithet ?? '',
    birth: ev(p?.birth),
    christening: ev(p?.christening),
    death: ev(p?.death),
    burial: ev(p?.burial),
    causeOfDeath: p?.causeOfDeath ?? '',
    ageAtDeath: p?.ageAtDeath != null ? String(p.ageAtDeath) : '',
    story: p?.story ?? '',
    photo: p?.photo ?? '',
  };
}

function draftEvent(d: EventDraft): EventInfo | null {
  const { date, approx } = normalizeDate(sanitizeText(d.date));
  const place = sanitizeText(d.place) || null;
  if (!date && !place) return null;
  return { date, approx, place };
}

function draftToFields(d: PersonDraft): Partial<Person> {
  return {
    given: sanitizeText(d.given) || null,
    surname: sanitizeText(d.surname) || null,
    sex: d.sex || null,
    title: sanitizeText(d.title) || null,
    suffix: sanitizeText(d.suffix) || null,
    nickname: sanitizeText(d.nickname) || null,
    epithet: sanitizeText(d.epithet) || null,
    birth: draftEvent(d.birth),
    christening: draftEvent(d.christening),
    death: draftEvent(d.death),
    burial: draftEvent(d.burial),
    causeOfDeath: sanitizeText(d.causeOfDeath) || null,
    ageAtDeath: sanitizeText(d.ageAtDeath) || null,
    story: sanitizeMultiline(d.story) || null,
    photo: sanitizePhoto(d.photo),
  };
}

// only fields that differ from the current record
function changedFields(current: Person, next: Partial<Person>): Partial<Person> {
  const out: Partial<Person> = {};
  for (const key of Object.keys(next) as (keyof Person)[]) {
    const a = JSON.stringify(current[key] ?? null);
    const b = JSON.stringify(next[key] ?? null);
    if (a !== b) (out as Record<string, unknown>)[key] = next[key];
  }
  return out;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  'mt-1 w-full bg-marriedin border border-line rounded-md px-2.5 py-1.5 text-sm placeholder:text-muted/60';

function EventFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: EventDraft;
  onChange: (v: EventDraft) => void;
}) {
  return (
    <fieldset className="grid grid-cols-2 gap-2">
      <Field label={`${label} date`}>
        <input
          className={inputCls}
          value={value.date}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
          placeholder="1942-12-25 or 1942"
        />
      </Field>
      <Field label={`${label} place`}>
        <input
          className={inputCls}
          value={value.place}
          onChange={(e) => onChange({ ...value, place: e.target.value })}
          placeholder="Town, Country"
        />
      </Field>
    </fieldset>
  );
}

function PersonFields({
  draft,
  onChange,
}: {
  draft: PersonDraft;
  onChange: (d: PersonDraft) => void;
}) {
  const set = (patch: Partial<PersonDraft>) => onChange({ ...draft, ...patch });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Given names">
          <input
            className={inputCls}
            value={draft.given}
            onChange={(e) => set({ given: e.target.value })}
          />
        </Field>
        <Field label="Surname">
          <input
            className={inputCls}
            value={draft.surname}
            onChange={(e) => set({ surname: e.target.value })}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Field label="Sex">
          <select
            className={inputCls}
            value={draft.sex}
            onChange={(e) => set({ sex: e.target.value as PersonDraft['sex'] })}
          >
            <option value="">unknown</option>
            <option value="F">Female</option>
            <option value="M">Male</option>
          </select>
        </Field>
        <Field label="Title">
          <input
            className={inputCls}
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="e.g. CHIEF"
          />
        </Field>
        <Field label="Suffix">
          <input
            className={inputCls}
            value={draft.suffix}
            onChange={(e) => set({ suffix: e.target.value })}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Nickname">
          <input
            className={inputCls}
            value={draft.nickname}
            onChange={(e) => set({ nickname: e.target.value })}
          />
        </Field>
        <Field label="Remembered as">
          <input
            className={inputCls}
            value={draft.epithet}
            onChange={(e) => set({ epithet: e.target.value })}
          />
        </Field>
      </div>
      <EventFields label="Birth" value={draft.birth} onChange={(v) => set({ birth: v })} />
      <EventFields
        label="Christening"
        value={draft.christening}
        onChange={(v) => set({ christening: v })}
      />
      <EventFields label="Death" value={draft.death} onChange={(v) => set({ death: v })} />
      <EventFields label="Burial" value={draft.burial} onChange={(v) => set({ burial: v })} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Cause of death">
          <input
            className={inputCls}
            value={draft.causeOfDeath}
            onChange={(e) => set({ causeOfDeath: e.target.value })}
          />
        </Field>
        <Field label="Age at death">
          <input
            className={inputCls}
            value={draft.ageAtDeath}
            onChange={(e) => set({ ageAtDeath: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Story / memories">
        <textarea
          className={`${inputCls} min-h-[90px]`}
          value={draft.story}
          onChange={(e) => set({ story: e.target.value })}
          placeholder="Anything you remember about them…"
        />
      </Field>
      <div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
          Photo
        </span>
        {draft.photo ? (
          <div className="mt-1 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={draft.photo}
              alt="Chosen photo"
              className="h-20 w-20 object-cover rounded-md border border-line"
            />
            <button
              type="button"
              onClick={() => set({ photo: '' })}
              className="text-xs text-muted hover:text-red-600 underline underline-offset-2"
            >
              Remove photo
            </button>
          </div>
        ) : (
          <label className="mt-1 flex items-center justify-center border border-dashed border-line rounded-md px-3 py-4 text-xs text-muted cursor-pointer hover:border-brass hover:text-brass">
            Add a photo of them (JPG/PNG — it will be resized automatically)
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  set({ photo: await fileToDataUri(file) });
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'Could not read that photo.');
                }
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

export default function SuggestModal({
  data,
  target,
  mode,
  onClose,
  onSubmit,
  delivery,
}: {
  data: FamilyData;
  target: Person;
  mode: SuggestMode;
  onClose: () => void;
  onSubmit: (sug: Suggestion) => Promise<void>;
  delivery: 'download' | 'queued';
}) {
  const [draft, setDraft] = useState<PersonDraft>(() =>
    draftFromPerson(mode === 'edit' ? target : undefined)
  );
  const [relation, setRelation] = useState<Relation>('child');
  const [familyId, setFamilyId] = useState('');
  const [submitter, setSubmitter] = useState({ name: '', email: '', relationship: '' });
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const spouseFams = spousesOf(data, target);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    dialogRef.current?.querySelector<HTMLElement>('input, select, textarea')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async () => {
    setError('');
    if (!submitter.name.trim()) {
      setError('Please tell us your name so Kelly knows who this is from.');
      return;
    }
    let payload: SuggestionPayload;
    if (mode === 'edit') {
      const fields = changedFields(target, draftToFields(draft));
      if (!Object.keys(fields).length) {
        setError('Nothing has changed yet.');
        return;
      }
      payload = { fields };
    } else if (mode === 'add') {
      const person = draftToFields(draft);
      if (!person.given && !person.surname) {
        setError('Please give the new person at least a name.');
        return;
      }
      payload = {
        relation,
        person,
        ...(relation === 'child' && familyId ? { familyId } : {}),
      };
    } else {
      if (!note.trim()) {
        setError('Please describe the problem.');
        return;
      }
      payload = { note: sanitizeMultiline(note) };
    }

    const sug: Suggestion = {
      suggestionId: `s_${Math.random().toString(36).slice(2, 8)}`,
      type: mode === 'edit' ? 'edit' : mode === 'add' ? 'addPerson' : 'reportError',
      targetId: target.id,
      submitter: {
        name: sanitizeText(submitter.name),
        email: sanitizeText(submitter.email),
        relationship: sanitizeText(submitter.relationship),
      },
      payload,
      message: sanitizeMultiline(message),
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    setBusy(true);
    try {
      await onSubmit(sug);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong — please try again.');
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<SuggestMode, string> = {
    edit: `Suggest an edit — ${displayName(target)}`,
    add: `Add a relative of ${displayName(target)}`,
    report: `Report a problem — ${displayName(target)}`,
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 flex items-start justify-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
      aria-label={titles[mode]}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        className="bg-card border border-line rounded-lg w-full max-w-xl my-8 p-5"
      >
        {done ? (
          <div className="text-center py-8">
            <h2 className="font-display text-2xl mb-3">Thank you</h2>
            <p className="text-sm text-muted max-w-md mx-auto">
              {delivery === 'queued'
                ? 'Your suggestion has been sent to Kelly for review. It will appear in the tree only after she approves it — nothing is published automatically.'
                : 'Your suggestion has been downloaded as a JSON file. Please email it to Kelly — she reviews every suggestion before it appears in the tree.'}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 border border-brass text-brass rounded-md px-4 py-2 text-sm"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 className="font-display text-xl mb-4">{titles[mode]}</h2>

            {mode === 'add' && (
              <div className="mb-4 grid grid-cols-2 gap-2">
                <Field label="Relationship to them">
                  <select
                    className={inputCls}
                    value={relation}
                    onChange={(e) => setRelation(e.target.value as Relation)}
                  >
                    <option value="child">Child</option>
                    <option value="parent">Parent</option>
                    <option value="spouse">Spouse</option>
                    <option value="sibling">Sibling</option>
                  </select>
                </Field>
                {relation === 'child' && spouseFams.length > 1 && (
                  <Field label="With which spouse?">
                    <select
                      className={inputCls}
                      value={familyId}
                      onChange={(e) => setFamilyId(e.target.value)}
                    >
                      <option value="">not sure</option>
                      {spouseFams.map(({ spouse, family }) => (
                        <option key={family.id} value={family.id}>
                          {displayName(spouse) || `Family ${family.id}`}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
            )}

            {mode === 'report' ? (
              <Field label="What looks wrong?">
                <textarea
                  className={`${inputCls} min-h-[110px]`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. the birth year is wrong — it should be 1948"
                />
              </Field>
            ) : (
              <PersonFields draft={draft} onChange={setDraft} />
            )}

            <hr className="border-line my-4" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Field label="Your name *">
                <input
                  className={inputCls}
                  value={submitter.name}
                  onChange={(e) => setSubmitter({ ...submitter, name: e.target.value })}
                />
              </Field>
              <Field label="Your email">
                <input
                  className={inputCls}
                  type="email"
                  value={submitter.email}
                  onChange={(e) => setSubmitter({ ...submitter, email: e.target.value })}
                />
              </Field>
              <Field label="Relationship">
                <input
                  className={inputCls}
                  value={submitter.relationship}
                  onChange={(e) =>
                    setSubmitter({ ...submitter, relationship: e.target.value })
                  }
                  placeholder="e.g. granddaughter"
                />
              </Field>
            </div>
            <div className="mt-2">
              <Field label="Note to Kelly (optional)">
                <textarea
                  className={`${inputCls} min-h-[60px]`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </Field>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600 mt-3">
                {error}
              </p>
            )}

            <div className="flex justify-between items-center mt-5">
              <p className="text-[11px] text-muted max-w-[55%]">
                This goes to Kelly for review before it appears in the tree.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="border border-line rounded-md px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={busy}
                  className="border border-brass bg-brass text-ground rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {busy ? 'Sending…' : 'Send to Kelly'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
