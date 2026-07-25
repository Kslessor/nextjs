// Data model — mirrors family-data.json (§3 of the brief).

export interface EventInfo {
  date: string | null; // "YYYY-MM-DD" | "YYYY" | null
  approx: boolean;
  place: string | null;
}

export interface Person {
  id: string; // I<n>
  given: string | null;
  surname: string | null;
  sex: 'M' | 'F' | null;
  title: string | null;
  suffix: string | null;
  nickname: string | null;
  epithet: string | null;
  birth: EventInfo | null;
  christening: EventInfo | null;
  death: EventInfo | null;
  burial: EventInfo | null;
  causeOfDeath: string | null;
  ageAtDeath: string | number | null;
  story: string | null;
  photo: string | null;
  parents: string | null; // family id the person is a CHILD of
  spouseFamilies: string[]; // family ids where this person is a spouse
}

export interface Family {
  id: string; // F<n>
  husband: string | null;
  wife: string | null;
  marriage: EventInfo | null;
  children: string[]; // ordered
}

export interface AuditEntry {
  at: string; // ISO-8601
  action: 'approve' | 'reject' | 'undo';
  suggestionId: string;
  summary: string;
  by: string;
}

export interface FamilyData {
  meta: {
    rootPersonId: string;
    revision?: number;
    source?: string;
    placeholder?: boolean;
    audit?: AuditEntry[];
    [k: string]: unknown;
  };
  people: Person[];
  families: Family[];
}

// ---- Suggestions (§5) ----

export type SuggestionType = 'edit' | 'addPerson' | 'addRelationship' | 'reportError';

export type Relation = 'parent' | 'spouse' | 'child' | 'sibling';

export interface EditPayload {
  fields: Partial<Person>; // only the changed fields
}

export interface AddPersonPayload {
  relation: Relation;
  person: Partial<Person>; // the new person's fields (no id yet)
  familyId?: string; // for "child": which of the target's families to attach to
}

export interface AddRelationshipPayload {
  relation: Relation;
  otherId: string; // existing person to link to the target
  familyId?: string;
}

export interface ReportErrorPayload {
  note: string;
}

export type SuggestionPayload =
  | EditPayload
  | AddPersonPayload
  | AddRelationshipPayload
  | ReportErrorPayload;

export interface Suggestion {
  suggestionId: string;
  type: SuggestionType;
  targetId: string;
  submitter: { name: string; email: string; relationship: string };
  payload: SuggestionPayload;
  message: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  decidedAt?: string;
  reason?: string;
}
