'use client';

import {
  childrenOf,
  displayName,
  formatEvent,
  fullName,
  lifespan,
  parentsOf,
  siblingsOf,
  spousesOf,
} from '@/lib/data';
import type { FamilyData, Person } from '@/lib/types';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 py-1.5 border-b border-line/40 text-sm">
      <div className="font-mono text-[11px] uppercase tracking-wider text-muted pt-0.5">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function PersonLink({
  person,
  onFocus,
}: {
  person: Person | undefined;
  onFocus: (id: string) => void;
}) {
  if (!person) return <span className="text-muted">unknown</span>;
  return (
    <button
      type="button"
      onClick={() => onFocus(person.id)}
      className="text-brass hover:underline focus-visible:underline text-left"
    >
      {displayName(person)}
    </button>
  );
}

export default function Profile({
  data,
  person,
  onFocus,
  onSuggestEdit,
  onAddRelative,
}: {
  data: FamilyData;
  person: Person;
  onFocus: (id: string) => void;
  onSuggestEdit: () => void;
  onAddRelative: () => void;
}) {
  const { father, mother } = parentsOf(data, person);
  const siblings = siblingsOf(data, person);
  const spouses = spousesOf(data, person);
  const children = childrenOf(data, person);

  return (
    <aside
      className="bg-card border border-line rounded-lg p-5"
      aria-label={`Profile of ${displayName(person)}`}
    >
      <header className="mb-3">
        {person.title && (
          <div className="font-mono text-[11px] uppercase tracking-widest text-brass">
            {person.title}
          </div>
        )}
        <h2 className="font-display text-2xl leading-tight">{fullName(person)}</h2>
        <div className="font-mono text-xs text-muted mt-1">
          {lifespan(person)}
          {person.nickname && <span className="ml-2">“{person.nickname}”</span>}
        </div>
        {person.epithet && (
          <p className="italic text-muted text-sm mt-1">{person.epithet}</p>
        )}
      </header>

      {person.photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={person.photo}
          alt={displayName(person)}
          className="rounded-md mb-4 max-h-56 object-cover"
        />
      )}

      <div className="mb-4">
        <Row label="Born">{formatEvent(person.birth) || null}</Row>
        <Row label="Christened">{formatEvent(person.christening) || null}</Row>
        <Row label="Died">{formatEvent(person.death) || null}</Row>
        <Row label="Buried">{formatEvent(person.burial) || null}</Row>
        <Row label="Cause">{person.causeOfDeath}</Row>
        <Row label="Age at death">{person.ageAtDeath}</Row>
        <Row label="Parents">
          {father || mother ? (
            <span className="flex flex-wrap gap-x-2">
              <PersonLink person={father} onFocus={onFocus} />
              {father && mother && <span className="text-muted">·</span>}
              <PersonLink person={mother} onFocus={onFocus} />
            </span>
          ) : null}
        </Row>
        <Row label="Siblings">
          {siblings.length ? (
            <span className="flex flex-wrap gap-x-2 gap-y-1">
              {siblings.map((s, i) => (
                <span key={s.id}>
                  <PersonLink person={s} onFocus={onFocus} />
                  {i < siblings.length - 1 && <span className="text-muted">,</span>}
                </span>
              ))}
            </span>
          ) : null}
        </Row>
        <Row label={spouses.length > 1 ? 'Spouses' : 'Spouse'}>
          {spouses.length ? (
            <span className="flex flex-col gap-1">
              {spouses.map(({ spouse, family }) => (
                <span key={family.id}>
                  <PersonLink person={spouse} onFocus={onFocus} />
                  {family.marriage && formatEvent(family.marriage) && (
                    <span className="font-mono text-[11px] text-muted ml-2">
                      m. {formatEvent(family.marriage)}
                    </span>
                  )}
                </span>
              ))}
            </span>
          ) : null}
        </Row>
        <Row label="Children">
          {children.length ? (
            <span className="flex flex-wrap gap-x-2 gap-y-1">
              {children.map(({ child }, i) => (
                <span key={child.id}>
                  <PersonLink person={child} onFocus={onFocus} />
                  {i < children.length - 1 && <span className="text-muted">,</span>}
                </span>
              ))}
            </span>
          ) : null}
        </Row>
      </div>

      {person.story && (
        <div className="mb-4">
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1">
            Story
          </h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{person.story}</p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onSuggestEdit}
          className="flex-1 border border-brass text-brass rounded-md px-3 py-2 text-sm hover:bg-brass hover:text-ground"
        >
          Suggest an edit
        </button>
        <button
          type="button"
          onClick={onAddRelative}
          className="flex-1 border border-line text-ink rounded-md px-3 py-2 text-sm hover:border-brass"
        >
          Add a relative
        </button>
      </div>
    </aside>
  );
}
