export type FieldType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'dropdown'
  | 'radio'
  | 'checkboxes'
  | 'smiley'
  | 'file'
  | 'dynamic'

export type DynamicKey =
  | 'patient_name'
  | 'date_of_birth'
  | 'clinic_service'
  | 'appointment_date'
  | 'provider_name'
  | 'provider_number'
  | 'medicare_items'

export type Operator = 'equals' | 'not_equals' | 'contains'

/** Display-or-hide rule (spec §15.3.2). One condition per field in v1.0. */
export interface DisplayCondition {
  sourceId: string
  operator: Operator
  value: string
}

/** Page jump rule (spec §15.3.1). First matching rule wins. */
export interface JumpRule {
  id: string
  option: string
  targetPageId: string
}

export interface Field {
  id: string
  type: FieldType
  label: string
  placeholder?: string
  helpText?: string
  required: boolean
  options?: string[]
  maxLength?: number
  min?: number
  max?: number
  minDate?: string
  maxDate?: string
  fileTypes?: string
  maxFileMb?: number
  dynamicKey?: DynamicKey
  condition?: DisplayCondition
  jumps?: JumpRule[]
  /** Answers that turn the Q-Flow form icon red (“action required”). */
  flagOptions?: string[]
}

export interface Page {
  id: string
  title: string
  description: string
  fields: Field[]
}

export type FormStatus = 'draft' | 'published' | 'unpublished' | 'expired' | 'archived'

export type Category = 'Pre-Appointment' | 'Post-Appointment' | 'Consent' | 'Survey' | 'Triage'

export type Trigger = 'General (manual access)' | 'Email' | 'SMS' | 'Push notification'

export interface FormSettings {
  category: Category | ''
  trigger: Trigger
  notificationTiming: string[]
  notificationTemplate: string
  deepLink: boolean
  anonymous: boolean
  accessDescription: string
  unableToVerifyDescription: string
  buttonLabel: string
  services: string[]
  confirmationMessage: string
  redirectUrl: string
  logo?: string
  buttonColor: string
  expiryValue: number
  expiryUnit: 'hours' | 'days'
  displayDaysBefore: number
  /** YYYY-MM-DD; '' = no automatic expiry. */
  expiresOn: string
}

export interface Form {
  id: string
  title: string
  description: string
  status: FormStatus
  version: number
  pages: Page[]
  settings: FormSettings
  createdBy: string
  createdAt: string
  updatedAt: string
  publishedAt?: string
  unpublishedAt?: string
  expiresAt?: string
  expiredAt?: string
  archivedAt?: string
}

export type Role = 'admin' | 'content' | 'staff'

export interface User {
  email: string
  name: string
  role: Role
}

export interface AuditEntry {
  id: string
  formId: string
  formTitle: string
  user: string
  at: string
  action: string
  changes?: { field: string; from: string; to: string }[]
}

export type Channel = 'VisitPlus' | 'SMS' | 'Email' | 'Push' | 'Browser'

export interface Patient {
  id: string
  firstName: string
  lastName: string
  dob: string // YYYY-MM-DD
  mrn: string
  phone: string
  email: string
}

export interface Appointment {
  id: string
  patientId: string
  facility: string
  speciality: string
  service: string
  clinic: string
  provider: string
  providerNumber: string
  location: string
  start: string // ISO
  durationMin: number
  token: string
  formIds: string[]
  checkedIn?: boolean
  medicareItems?: string
}

export type AnswerValue = string | string[] | number | null

export interface Submission {
  id: string
  formId: string
  formTitle: string
  formVersion: number
  appointmentId?: string
  submittedAt: string
  channel: Channel
  answers: Record<string, AnswerValue>
  /** Frozen copy of the pages at submit time, so later edits never rewrite history. */
  pages: Page[]
  actionRequired: boolean
  actionNote?: string
  actionResolvedAt?: string
  actionResolvedBy?: string
}

export interface DB {
  version: number
  forms: Form[]
  audit: AuditEntry[]
  patients: Patient[]
  appointments: Appointment[]
  submissions: Submission[]
  currentUser: string
  ctaSnoozedUntil: Record<string, string>
}
