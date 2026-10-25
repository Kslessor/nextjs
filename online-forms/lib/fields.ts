import type { DynamicKey, Field, FieldType } from './types'
import { uid } from './util'

export interface FieldMeta {
  type: FieldType
  label: string
  group: 'basic' | 'choice' | 'record'
  hint: string
}

export const FIELD_CATALOG: FieldMeta[] = [
  { type: 'short_text', label: 'Short Text', group: 'basic', hint: 'Names, titles, short answers' },
  { type: 'long_text', label: 'Long Text', group: 'basic', hint: 'Comments and descriptions' },
  { type: 'number', label: 'Number', group: 'basic', hint: 'Integers or decimals' },
  { type: 'email', label: 'Email', group: 'basic', hint: 'name@domain.com' },
  { type: 'phone', label: 'Phone', group: 'basic', hint: 'Digits, + and spaces' },
  { type: 'date', label: 'Date', group: 'basic', hint: 'Opens a date selector' },
  { type: 'dropdown', label: 'Dropdown', group: 'choice', hint: 'Single choice, compact' },
  { type: 'radio', label: 'Radio Buttons', group: 'choice', hint: 'Single choice, visible' },
  { type: 'checkboxes', label: 'Checkboxes', group: 'choice', hint: 'Multiple selections' },
  { type: 'smiley', label: 'Smiley Face', group: 'choice', hint: 'Five-point feedback scale' },
  { type: 'file', label: 'File Upload', group: 'choice', hint: 'Documents and images' },
]

export const DYNAMIC_FIELDS: { key: DynamicKey; label: string }[] = [
  { key: 'patient_name', label: 'Patient Name' },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'clinic_service', label: 'Clinic Service' },
  { key: 'appointment_date', label: 'Appointment Date' },
  { key: 'provider_name', label: 'Provider Name' },
  { key: 'provider_number', label: 'Provider Number' },
  { key: 'medicare_items', label: 'Medicare Items' },
]

export const SMILEYS = ['Very unhappy', 'Unhappy', 'Neutral', 'Happy', 'Very happy']

export const isChoice = (t: FieldType) => t === 'dropdown' || t === 'radio' || t === 'checkboxes' || t === 'smiley'
/** Page jumps need a single answer to branch on. */
export const canJump = (t: FieldType) => t === 'dropdown' || t === 'radio' || t === 'smiley'
export const isInput = (t: FieldType) => t !== 'dynamic'

export function fieldLabel(t: FieldType): string {
  if (t === 'dynamic') return 'Patient record'
  return FIELD_CATALOG.find((f) => f.type === t)?.label ?? t
}

export function optionsFor(f: Field): string[] {
  if (f.type === 'smiley') return SMILEYS
  return f.options ?? []
}

export function newField(type: FieldType, dynamicKey?: DynamicKey): Field {
  const base: Field = { id: uid('fld'), type, label: fieldLabel(type), required: false }
  switch (type) {
    case 'dropdown':
    case 'radio':
    case 'checkboxes':
      return { ...base, label: 'Untitled question', options: ['Option 1', 'Option 2', 'Option 3'] }
    case 'smiley':
      return { ...base, label: 'How was your experience?' }
    case 'file':
      return { ...base, label: 'Upload a document', fileTypes: '.pdf,.jpg,.png', maxFileMb: 10 }
    case 'dynamic': {
      const d = DYNAMIC_FIELDS.find((x) => x.key === dynamicKey) ?? DYNAMIC_FIELDS[0]
      return { ...base, label: d.label, dynamicKey: d.key }
    }
    default:
      return { ...base, label: fieldLabel(type), placeholder: '' }
  }
}
