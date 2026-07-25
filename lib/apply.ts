// Applies an approved suggestion to the canonical dataset.
// Pure: takes data + suggestion, returns a NEW dataset (never mutates input),
// so the console can keep snapshots for undo. Both sides of every
// relationship are kept in sync here — this is the only write path.

import { blankPerson, familyById, nextId, personById, emptyEvent } from './data';
import type {
  AddPersonPayload,
  AddRelationshipPayload,
  EditPayload,
  Family,
  FamilyData,
  Person,
  Relation,
  Suggestion,
} from './types';

export class ApplyError extends Error {}

const EDITABLE_FIELDS: (keyof Person)[] = [
  'given', 'surname', 'sex', 'title', 'suffix', 'nickname', 'epithet',
  'birth', 'christening', 'death', 'burial', 'causeOfDeath', 'ageAtDeath',
  'story', 'photo',
];

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

function mustPerson(data: FamilyData, id: string): Person {
  const p = personById(data, id);
  if (!p) throw new ApplyError(`Unknown person id: ${id}`);
  return p;
}

function newFamily(data: FamilyData): Family {
  const fam: Family = { id: nextId('F', data), husband: null, wife: null, marriage: null, children: [] };
  data.families.push(fam);
  return fam;
}

// Attach `child` to `fam` — sets both sides.
function attachChild(fam: Family, child: Person) {
  if (child.parents && child.parents !== fam.id) {
    throw new ApplyError(`${child.id} already has parents (${child.parents})`);
  }
  if (!fam.children.includes(child.id)) fam.children.push(child.id);
  child.parents = fam.id;
}

// Attach `spouse` into a family slot — sets both sides.
function attachSpouse(fam: Family, spouse: Person) {
  const slot = spouse.sex === 'F' ? 'wife' : 'husband';
  const other = slot === 'wife' ? 'husband' : 'wife';
  if (fam[slot] && fam[slot] !== spouse.id) {
    if (!fam[other]) {
      fam[other] = spouse.id;
    } else {
      throw new ApplyError(`Family ${fam.id} already has both spouses`);
    }
  } else {
    fam[slot] = spouse.id;
  }
  if (!spouse.spouseFamilies.includes(fam.id)) spouse.spouseFamilies.push(fam.id);
}

function linkRelative(data: FamilyData, target: Person, other: Person, relation: Relation, familyId?: string) {
  switch (relation) {
    case 'child': {
      let fam: Family | undefined;
      if (familyId) {
        fam = familyById(data, familyId);
        if (!fam) throw new ApplyError(`Unknown family id: ${familyId}`);
        if (fam.husband !== target.id && fam.wife !== target.id) {
          throw new ApplyError(`${target.id} is not a spouse in ${familyId}`);
        }
      } else {
        fam = data.families.find((f) => f.id === target.spouseFamilies[0]);
      }
      if (!fam) {
        fam = newFamily(data);
        attachSpouse(fam, target);
      }
      attachChild(fam, other);
      break;
    }
    case 'parent': {
      let fam = familyById(data, target.parents);
      if (!fam) {
        fam = newFamily(data);
        attachChild(fam, target);
      }
      attachSpouse(fam, other);
      break;
    }
    case 'spouse': {
      let fam: Family | undefined;
      if (familyId) {
        fam = familyById(data, familyId);
        if (!fam) throw new ApplyError(`Unknown family id: ${familyId}`);
      }
      if (!fam) {
        // reuse a family where the target is alone, else create one
        fam = target.spouseFamilies
          .map((fid) => familyById(data, fid))
          .find((f): f is Family => !!f && (!f.husband || !f.wife));
      }
      if (!fam) {
        fam = newFamily(data);
        fam.marriage = emptyEvent();
      }
      attachSpouse(fam, target);
      attachSpouse(fam, other);
      break;
    }
    case 'sibling': {
      let fam = familyById(data, target.parents);
      if (!fam) {
        fam = newFamily(data);
        attachChild(fam, target);
      }
      attachChild(fam, other);
      break;
    }
    default:
      throw new ApplyError(`Unknown relation: ${relation}`);
  }
}

export interface ApplyResult {
  data: FamilyData;
  summary: string;
  newPersonId?: string;
}

export function applySuggestion(input: FamilyData, sug: Suggestion): ApplyResult {
  const data = clone(input);
  data.meta.revision = (typeof data.meta.revision === 'number' ? data.meta.revision : 0) + 1;

  switch (sug.type) {
    case 'edit': {
      const target = mustPerson(data, sug.targetId);
      const payload = sug.payload as EditPayload;
      if (!payload.fields || typeof payload.fields !== 'object') {
        throw new ApplyError('Edit payload has no fields');
      }
      const changed: string[] = [];
      for (const key of EDITABLE_FIELDS) {
        if (key in payload.fields) {
          (target as unknown as Record<string, unknown>)[key] = clone(
            (payload.fields as Record<string, unknown>)[key] ?? null
          );
          changed.push(key);
        }
      }
      if (!changed.length) throw new ApplyError('Edit changes nothing');
      return { data, summary: `Edited ${target.id}: ${changed.join(', ')}` };
    }

    case 'addPerson': {
      const target = mustPerson(data, sug.targetId);
      const payload = sug.payload as AddPersonPayload;
      const person = blankPerson(nextId('I', data));
      for (const key of EDITABLE_FIELDS) {
        if (payload.person && key in payload.person) {
          (person as unknown as Record<string, unknown>)[key] = clone(
            (payload.person as Record<string, unknown>)[key] ?? null
          );
        }
      }
      data.people.push(person);
      linkRelative(data, target, person, payload.relation, payload.familyId);
      return {
        data,
        summary: `Added ${person.id} as ${payload.relation} of ${target.id}`,
        newPersonId: person.id,
      };
    }

    case 'addRelationship': {
      const target = mustPerson(data, sug.targetId);
      const payload = sug.payload as AddRelationshipPayload;
      const other = mustPerson(data, payload.otherId);
      linkRelative(data, target, other, payload.relation, payload.familyId);
      return { data, summary: `Linked ${other.id} as ${payload.relation} of ${target.id}` };
    }

    case 'reportError': {
      // Nothing to apply — approving just acknowledges the report.
      mustPerson(data, sug.targetId);
      return { data, summary: `Acknowledged report on ${sug.targetId}` };
    }

    default:
      throw new ApplyError(`Unknown suggestion type: ${(sug as Suggestion).type}`);
  }
}

// Validation used before accepting a suggestion into the queue: every id the
// payload references must exist.
export function validateSuggestion(data: FamilyData, sug: Suggestion): string | null {
  try {
    if (!personById(data, sug.targetId)) return `Unknown target id: ${sug.targetId}`;
    if (sug.type === 'addRelationship') {
      const p = sug.payload as AddRelationshipPayload;
      if (!personById(data, p.otherId)) return `Unknown person id: ${p.otherId}`;
      if (p.familyId && !familyById(data, p.familyId)) return `Unknown family id: ${p.familyId}`;
    }
    if (sug.type === 'addPerson') {
      const p = sug.payload as AddPersonPayload;
      if (p.familyId && !familyById(data, p.familyId)) return `Unknown family id: ${p.familyId}`;
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Invalid suggestion';
  }
}
