import type { Appointment, AuditEntry, DB, Field, Form, FormSettings, Page, Patient, Submission, User } from './types'
import { addDays, startOfDay } from './util'

export const USERS: User[] = [
  { email: 'kate.sullivan@nexa.com.au', name: 'Kate Sullivan', role: 'admin' },
  { email: 'calley.mccarthy@nexa.com.au', name: 'Calley McCarthy', role: 'content' },
  { email: 'james.okafor@nexa.com.au', name: 'James Okafor', role: 'staff' },
]

export const HEALTH_NETWORK = { name: 'NEXA Health Network', phone: '02 9382 2222' }

export interface ServiceNode {
  id: string
  name: string
  children?: ServiceNode[]
}

/** Facility › Speciality/Clinic tree used by Settings › Units & Services. */
export const SERVICE_TREE: ServiceNode = {
  id: 'nexa',
  name: 'NEXA Group',
  children: [
    {
      id: 'pow',
      name: 'Prince of Wales Hospital',
      children: [
        { id: 'card', name: 'Cardiology Outpatients' },
        { id: 'orth', name: 'Orthopaedic Outpatients' },
        { id: 'opht', name: 'Ophthalmology Clinic' },
        { id: 'derm', name: 'Dermatology Clinic' },
      ],
    },
    {
      id: 'sch',
      name: "Sydney Children's Hospital",
      children: [
        { id: 'pendo', name: 'Paediatric Endocrinology' },
        { id: 'pgast', name: 'Paediatric Gastroenterology' },
        { id: 'presp', name: 'Paediatric Respiratory' },
      ],
    },
    {
      id: 'nsh',
      name: 'NEXA North Shore',
      children: [
        { id: 'preadm', name: 'Pre-Admission Clinic' },
        { id: 'fracture', name: 'Fracture Clinic' },
      ],
    },
  ],
}

export const NOTIFICATION_TEMPLATES = [
  'PreAppointmentForm',
  'PreAppointmentFormReminder',
  'PostAppointmentFeedback',
  'MedicareConsentRequest',
  'GeneralFormLink',
]

export const NOTIFICATION_TIMINGS = ['1 week', '5 days', '3 days', '2 days', '1 day']

export const CATEGORIES = ['Pre-Appointment', 'Post-Appointment', 'Consent', 'Survey', 'Triage'] as const

export function defaultSettings(): FormSettings {
  return {
    category: '',
    trigger: 'General (manual access)',
    notificationTiming: ['3 days', '1 day'],
    notificationTemplate: 'PreAppointmentForm',
    deepLink: true,
    anonymous: false,
    accessDescription: 'Your care team has asked you to complete this form before your appointment.',
    unableToVerifyDescription: `Your name and date of birth must exactly match your patient record. If you are having trouble verifying, please call the facility on ${HEALTH_NETWORK.phone}.`,
    buttonLabel: 'Pre-appointment form',
    services: [],
    confirmationMessage: 'Thank you for your submission!',
    redirectUrl: '',
    buttonColor: '#1f7577',
    expiryValue: 0,
    expiryUnit: 'hours',
    displayDaysBefore: 7,
    expiresOn: '',
  }
}

let n = 0
const id = (p: string) => `${p}_${(++n).toString(36).padStart(3, '0')}`

const f = (x: Omit<Field, 'id' | 'required'> & { required?: boolean }): Field => ({ id: id('fld'), required: false, ...x })

function checklistForm(now: Date): Form {
  const p1: Page = {
    id: 'pg_hvc_1',
    title: 'Your appointment',
    description: 'Please check these details are correct before you continue.',
    fields: [
      f({ type: 'dynamic', label: 'Patient Name', dynamicKey: 'patient_name' }),
      f({ type: 'dynamic', label: 'Appointment', dynamicKey: 'appointment_date' }),
      f({
        type: 'checkboxes',
        label: "Do you have the following items for your child's hospital visit?",
        options: ["Your child's appointment letter", 'Your Medicare card', 'Your health insurance details or evidence of current fund membership'],
        required: true,
      }),
    ],
  }
  const meds = f({ type: 'radio', label: 'Is your child currently taking any medications?', options: ['Yes', 'No'], required: true })
  const p2: Page = {
    id: 'pg_hvc_2',
    title: 'Medications',
    description: '',
    fields: [
      meds,
      f({
        type: 'long_text',
        label: 'Please list all medications your child is currently receiving.',
        placeholder: 'Enter details',
        required: true,
        condition: { sourceId: meds.id, operator: 'equals', value: 'Yes' },
      }),
    ],
  }
  const p3: Page = {
    id: 'pg_hvc_3',
    title: 'Preparation',
    description: '',
    fields: [
      f({ type: 'radio', label: 'Has your child seen their GP since their last appointment?', options: ['Yes', 'No', 'Unsure'], required: true }),
      f({ type: 'radio', label: 'Will you need an interpreter on the day?', options: ['Yes', 'No'], required: true, flagOptions: ['Yes'] }),
      f({ type: 'long_text', label: 'Do you have any questions for the doctor?', placeholder: 'Enter details' }),
    ],
  }
  return {
    id: 'frm_checklist',
    title: 'Hospital Visit Checklist',
    description: "Pre-appointment checklist for families attending a children's outpatient clinic.",
    status: 'published',
    version: 1,
    pages: [p1, p2, p3],
    settings: {
      ...defaultSettings(),
      category: 'Pre-Appointment',
      trigger: 'SMS',
      services: ['pendo', 'pgast', 'presp', 'card'],
      buttonLabel: 'Pre-appointment form',
      notificationTiming: ['5 days', '1 day'],
      accessDescription: 'Your care team requires a few details to prepare for your visit.',
    },
    createdBy: 'calley.mccarthy@nexa.com.au',
    createdAt: addDays(now, -40).toISOString(),
    updatedAt: addDays(now, -21).toISOString(),
    publishedAt: addDays(now, -21).toISOString(),
    expiresAt: addDays(now, 344).toISOString(),
  }
}

function feedbackForm(now: Date): Form {
  const care = f({
    type: 'smiley',
    label: 'I was happy with the care I received today',
    required: true,
    flagOptions: ['Very unhappy'],
    jumps: [
      { id: 'jmp_1', option: 'Very unhappy', targetPageId: 'pg_fb_2' },
      { id: 'jmp_2', option: 'Unhappy', targetPageId: 'pg_fb_2' },
      { id: 'jmp_3', option: 'Neutral', targetPageId: 'pg_fb_3' },
      { id: 'jmp_4', option: 'Happy', targetPageId: 'pg_fb_3' },
      { id: 'jmp_5', option: 'Very happy', targetPageId: 'pg_fb_3' },
    ],
  })
  return {
    id: 'frm_feedback',
    title: 'Outpatient Feedback',
    description: 'A short survey sent after outpatient appointments to measure patient experience.',
    status: 'published',
    version: 1,
    pages: [
      {
        id: 'pg_fb_1',
        title: 'Feedback',
        description: 'Tell us how we did. It takes less than a minute.',
        fields: [
          f({ type: 'smiley', label: 'I was happy with my visit today', required: true }),
          f({ type: 'smiley', label: 'The wait time for my appointment was acceptable', required: true }),
          f({ type: 'smiley', label: 'The staff were friendly and helpful', required: true }),
          care,
        ],
      },
      {
        id: 'pg_fb_2',
        title: 'Tell us what went wrong',
        description: 'We’re sorry your visit didn’t meet expectations.',
        fields: [
          f({ type: 'long_text', label: 'What could we have done better?', placeholder: 'Enter details', required: true }),
          f({ type: 'radio', label: 'Would you like a patient liaison officer to contact you?', options: ['Yes', 'No'], required: true, flagOptions: ['Yes'] }),
        ],
      },
      {
        id: 'pg_fb_3',
        title: 'Anything else?',
        description: '',
        fields: [f({ type: 'long_text', label: 'Any other comments', placeholder: 'Optional' })],
      },
    ],
    settings: {
      ...defaultSettings(),
      category: 'Post-Appointment',
      trigger: 'Push notification',
      notificationTemplate: 'PostAppointmentFeedback',
      notificationTiming: [],
      services: ['card', 'orth', 'opht', 'derm'],
      buttonLabel: 'Leave feedback',
      anonymous: true,
      confirmationMessage: 'Thank you for your feedback',
      expiryValue: 14,
      expiryUnit: 'days',
    },
    createdBy: 'kate.sullivan@nexa.com.au',
    createdAt: addDays(now, -90).toISOString(),
    updatedAt: addDays(now, -60).toISOString(),
    publishedAt: addDays(now, -60).toISOString(),
    expiresAt: addDays(now, 305).toISOString(),
  }
}

function medicareForm(now: Date): Form {
  return {
    id: 'frm_medicare',
    title: 'Medicare AOB Consent',
    description: 'Assignment of benefit consent so the hospital can bill Medicare on the patient’s behalf.',
    status: 'published',
    version: 1,
    pages: [
      {
        id: 'pg_med_1',
        title: 'Consent Details',
        description: 'Your doctor requires your consent to assign your Medicare benefit to them for the health service you received.',
        fields: [
          f({ type: 'dynamic', label: 'Patient Name', dynamicKey: 'patient_name' }),
          f({ type: 'dynamic', label: 'Date of Birth', dynamicKey: 'date_of_birth' }),
          f({ type: 'dynamic', label: 'Provider', dynamicKey: 'provider_name' }),
          f({ type: 'dynamic', label: 'Provider Number', dynamicKey: 'provider_number' }),
          f({ type: 'dynamic', label: 'Medicare Items', dynamicKey: 'medicare_items' }),
          f({
            type: 'radio',
            label: 'I assign my right to Medicare benefits to the provider named above',
            options: ['Yes, I consent', 'No, I do not consent'],
            required: true,
            flagOptions: ['No, I do not consent'],
          }),
          f({ type: 'short_text', label: 'Signature', placeholder: 'Type your full name as signature', required: true }),
        ],
      },
    ],
    settings: {
      ...defaultSettings(),
      category: 'Consent',
      trigger: 'SMS',
      notificationTemplate: 'MedicareConsentRequest',
      notificationTiming: [],
      services: ['card', 'orth'],
      buttonLabel: 'Give Medicare consent',
      expiryValue: 7,
      expiryUnit: 'days',
      accessDescription: 'Your doctor requires your consent to assign your Medicare benefit to them for the health service you received.',
    },
    createdBy: 'kate.sullivan@nexa.com.au',
    createdAt: addDays(now, -30).toISOString(),
    updatedAt: addDays(now, -12).toISOString(),
    publishedAt: addDays(now, -12).toISOString(),
    expiresAt: addDays(now, 353).toISOString(),
  }
}

function intakeForm(now: Date): Form {
  return {
    id: 'frm_intake',
    title: 'Patient Intake Form',
    description: 'Comprehensive patient registration and medical history collection for new patients.',
    status: 'draft',
    version: 1,
    pages: [
      {
        id: 'pg_in_1',
        title: 'Personal details',
        description: '',
        fields: [
          f({ type: 'short_text', label: 'Preferred name', placeholder: 'e.g. Sam' }),
          f({ type: 'email', label: 'Email', placeholder: 'name@domain.com', required: true }),
          f({ type: 'phone', label: 'Mobile number', placeholder: '04xx xxx xxx', required: true }),
          f({ type: 'dropdown', label: 'Preferred language', options: ['English', 'Mandarin', 'Arabic', 'Vietnamese', 'Greek', 'Other'] }),
        ],
      },
      {
        id: 'pg_in_2',
        title: 'Medical history',
        description: 'This helps your clinician prepare for your visit.',
        fields: [
          f({ type: 'checkboxes', label: 'Do you have any of the following conditions?', options: ['Diabetes', 'Asthma', 'Heart disease', 'High blood pressure', 'None of these'] }),
          f({ type: 'long_text', label: 'Known allergies', placeholder: 'List any allergies and reactions' }),
          f({ type: 'number', label: 'Height (cm)', min: 30, max: 250 }),
        ],
      },
      {
        id: 'pg_in_3',
        title: 'Emergency contact',
        description: '',
        fields: [
          f({ type: 'short_text', label: 'Contact name', required: true }),
          f({ type: 'phone', label: 'Contact phone', required: true }),
          f({ type: 'file', label: 'Referral letter', fileTypes: '.pdf,.jpg,.png', maxFileMb: 10 }),
        ],
      },
    ],
    settings: { ...defaultSettings(), category: 'Pre-Appointment', services: ['preadm'] },
    createdBy: 'calley.mccarthy@nexa.com.au',
    createdAt: addDays(now, -9).toISOString(),
    updatedAt: addDays(now, -2).toISOString(),
  }
}

function simpleForm(
  now: Date,
  o: Pick<Form, 'id' | 'title' | 'description' | 'status' | 'createdBy'> & { category: FormSettings['category']; ago: number; extra?: Partial<Form> },
): Form {
  return {
    id: o.id,
    title: o.title,
    description: o.description,
    status: o.status,
    version: 1,
    pages: [
      {
        id: `${o.id}_p1`,
        title: 'Page 1',
        description: '',
        fields: [
          f({ type: 'smiley', label: 'Overall, how was your experience?', required: true }),
          f({ type: 'radio', label: 'Would you recommend us to friends and family?', options: ['Yes', 'No', 'Not sure'] }),
          f({ type: 'long_text', label: 'Comments', placeholder: 'Optional' }),
        ],
      },
    ],
    settings: { ...defaultSettings(), category: o.category },
    createdBy: o.createdBy,
    createdAt: addDays(now, -o.ago).toISOString(),
    updatedAt: addDays(now, -o.ago + 3).toISOString(),
    ...o.extra,
  }
}

const PATIENTS: Patient[] = [
  { id: 'pt_harry', firstName: 'Harry', lastName: 'Manson', dob: '1988-02-04', mrn: '20220187', phone: '0412 555 019', email: 'harry.manson@example.com' },
  { id: 'pt_ella', firstName: 'Ella', lastName: 'Thompson', dob: '2014-05-12', mrn: '20222021', phone: '0400 555 211', email: 'k.thompson@example.com' },
  { id: 'pt_oliver', firstName: 'Oliver', lastName: 'Thompson', dob: '2016-09-03', mrn: '20222022', phone: '0400 555 211', email: 'k.thompson@example.com' },
  { id: 'pt_aisha', firstName: 'Aisha', lastName: 'Rahman', dob: '2012-11-21', mrn: '20219844', phone: '0433 555 870', email: 'aisha.r@example.com' },
  { id: 'pt_liam', firstName: 'Liam', lastName: "O'Connor", dob: '1975-07-30', mrn: '20184410', phone: '0421 555 302', email: 'liam.oc@example.com' },
  { id: 'pt_mia', firstName: 'Mia', lastName: 'Nguyen', dob: '1993-03-17', mrn: '20230561', phone: '0450 555 664', email: 'mia.nguyen@example.com' },
  { id: 'pt_noah', firstName: 'Noah', lastName: 'Williams', dob: '1961-12-02', mrn: '20150097', phone: '0466 555 128', email: 'noah.w@example.com' },
  { id: 'pt_grace', firstName: 'Grace', lastName: 'Kim', dob: '2010-01-25', mrn: '20217733', phone: '0477 555 905', email: 'grace.kim@example.com' },
]

function at(day: Date, h: number, m: number): string {
  const d = new Date(day)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

type ApptSeed = Omit<Appointment, 'id' | 'token' | 'facility' | 'speciality' | 'service' | 'location' | 'providerNumber' | 'durationMin'> &
  Partial<Pick<Appointment, 'service' | 'location' | 'durationMin'>>

const CLINIC_INFO: Record<string, { facility: string; speciality: string; location: string; providerNumber: string }> = {
  'Cardiology Outpatients': { facility: 'Prince of Wales Hospital', speciality: 'Cardiology', location: 'Level 3, Building B', providerNumber: '2401587T' },
  'Orthopaedic Outpatients': { facility: 'Prince of Wales Hospital', speciality: 'Orthopaedics', location: 'Telephone', providerNumber: '2318840B' },
  'Ophthalmology Clinic': { facility: 'Prince of Wales Hospital', speciality: 'Ophthalmology', location: 'Level 1, Parkes Building', providerNumber: '2299016K' },
  'Paediatric Endocrinology': { facility: "Sydney Children's Hospital", speciality: 'Paediatrics', location: 'Level 2, Clinic C', providerNumber: '2187733A' },
  'Paediatric Gastroenterology': { facility: "Sydney Children's Hospital", speciality: 'Paediatrics', location: 'Level 2, Clinic D', providerNumber: '2190045F' },
  'Paediatric Respiratory': { facility: "Sydney Children's Hospital", speciality: 'Paediatrics', location: 'Level 1, Clinic A', providerNumber: '2177301H' },
}

function appt(i: number, s: ApptSeed): Appointment {
  const info = CLINIC_INFO[s.clinic]
  return {
    id: `apt_${i}`,
    token: `t${(i * 7919).toString(36)}x${i}`,
    facility: info.facility,
    speciality: info.speciality,
    service: s.service ?? 'Consultation',
    location: s.location ?? info.location,
    providerNumber: info.providerNumber,
    durationMin: s.durationMin ?? 15,
    ...s,
  }
}

function appointments(now: Date): Appointment[] {
  const today = startOfDay(now)
  const t1 = addDays(today, 1)
  const t2 = addDays(today, 2)
  const y7 = addDays(today, -3)
  return [
    appt(1, { patientId: 'pt_harry', clinic: 'Cardiology Outpatients', provider: 'Dr. Sarah Smith', start: at(t2, 9, 0), formIds: ['frm_checklist'] }),
    appt(2, { patientId: 'pt_harry', clinic: 'Orthopaedic Outpatients', provider: 'Dr. Sarah Smith', start: at(y7, 15, 0), formIds: ['frm_feedback', 'frm_medicare'], medicareItems: '116 · Subsequent specialist attendance', service: 'Review' }),
    appt(3, { patientId: 'pt_ella', clinic: 'Paediatric Endocrinology', provider: 'Dr. Priya Raman', start: at(today, 11, 45), formIds: ['frm_checklist'], service: 'Thyroid' }),
    appt(4, { patientId: 'pt_oliver', clinic: 'Paediatric Gastroenterology', provider: 'Dr. Marcus Lee', start: at(today, 13, 30), formIds: ['frm_checklist'], durationMin: 5 }),
    appt(5, { patientId: 'pt_aisha', clinic: 'Paediatric Gastroenterology', provider: 'Dr. Marcus Lee', start: at(today, 15, 0), formIds: ['frm_checklist'], durationMin: 5 }),
    appt(6, { patientId: 'pt_grace', clinic: 'Paediatric Endocrinology', provider: 'Dr. Priya Raman', start: at(today, 9, 15), formIds: ['frm_checklist'], service: 'Thyroid' }),
    appt(7, { patientId: 'pt_liam', clinic: 'Cardiology Outpatients', provider: 'Dr. Sarah Smith', start: at(today, 10, 0), formIds: ['frm_checklist'] }),
    appt(8, { patientId: 'pt_noah', clinic: 'Cardiology Outpatients', provider: 'Dr. Sarah Smith', start: at(today, 10, 30), formIds: ['frm_checklist'] }),
    appt(9, { patientId: 'pt_mia', clinic: 'Ophthalmology Clinic', provider: 'Dr. Ahmed Haddad', start: at(today, 14, 15), formIds: ['frm_feedback'] }),
    appt(10, { patientId: 'pt_mia', clinic: 'Paediatric Respiratory', provider: 'Dr. Jo Bennett', start: at(t1, 10, 0), formIds: ['frm_checklist'] }),
    appt(11, { patientId: 'pt_grace', clinic: 'Paediatric Respiratory', provider: 'Dr. Jo Bennett', start: at(t1, 11, 30), formIds: ['frm_checklist'] }),
    appt(12, { patientId: 'pt_noah', clinic: 'Orthopaedic Outpatients', provider: 'Dr. Tom Russo', start: at(y7, 10, 0), formIds: ['frm_medicare'], medicareItems: '104 · Specialist initial consultation' }),
  ]
}

function answerFor(form: Form, label: string, v: Submission['answers'][string]): [string, Submission['answers'][string]] {
  const fld = form.pages.flatMap((p) => p.fields).find((x) => x.label === label)!
  return [fld.id, v]
}

function submissions(now: Date, forms: Form[]): Submission[] {
  const chk = forms.find((x) => x.id === 'frm_checklist')!
  const med = forms.find((x) => x.id === 'frm_medicare')!
  const sub = (o: Omit<Submission, 'formTitle' | 'formVersion' | 'pages'>, form: Form): Submission => ({
    ...o,
    formTitle: form.title,
    formVersion: form.version,
    pages: form.pages,
  })
  return [
    sub(
      {
        id: 'sub_1',
        formId: chk.id,
        appointmentId: 'apt_4',
        submittedAt: addDays(now, -1).toISOString(),
        channel: 'VisitPlus',
        actionRequired: false,
        answers: Object.fromEntries([
          answerFor(chk, "Do you have the following items for your child's hospital visit?", ["Your child's appointment letter", 'Your Medicare card']),
          answerFor(chk, 'Is your child currently taking any medications?', 'Yes'),
          answerFor(chk, 'Please list all medications your child is currently receiving.', 'Movicol 1 sachet daily\nNexium 10mg mornings'),
          answerFor(chk, 'Has your child seen their GP since their last appointment?', 'Yes'),
          answerFor(chk, 'Will you need an interpreter on the day?', 'No'),
          answerFor(chk, 'Do you have any questions for the doctor?', 'Can we discuss reducing the Nexium dose?'),
        ]),
      },
      chk,
    ),
    sub(
      {
        id: 'sub_2',
        formId: chk.id,
        appointmentId: 'apt_5',
        submittedAt: new Date(now.getTime() - 5 * 3600e3).toISOString(),
        channel: 'SMS',
        actionRequired: true,
        actionNote: 'Will you need an interpreter on the day? — Yes',
        answers: Object.fromEntries([
          answerFor(chk, "Do you have the following items for your child's hospital visit?", ['Your Medicare card']),
          answerFor(chk, 'Is your child currently taking any medications?', 'No'),
          answerFor(chk, 'Has your child seen their GP since their last appointment?', 'Unsure'),
          answerFor(chk, 'Will you need an interpreter on the day?', 'Yes'),
          answerFor(chk, 'Do you have any questions for the doctor?', 'We will need an Arabic interpreter please.'),
        ]),
      },
      chk,
    ),
    sub(
      {
        id: 'sub_3',
        formId: chk.id,
        appointmentId: 'apt_7',
        submittedAt: new Date(now.getTime() - 26 * 3600e3).toISOString(),
        channel: 'Email',
        actionRequired: false,
        answers: Object.fromEntries([
          answerFor(chk, "Do you have the following items for your child's hospital visit?", ["Your child's appointment letter", 'Your Medicare card', 'Your health insurance details or evidence of current fund membership']),
          answerFor(chk, 'Is your child currently taking any medications?', 'No'),
          answerFor(chk, 'Has your child seen their GP since their last appointment?', 'No'),
          answerFor(chk, 'Will you need an interpreter on the day?', 'No'),
        ]),
      },
      chk,
    ),
    sub(
      {
        id: 'sub_4',
        formId: med.id,
        appointmentId: 'apt_12',
        submittedAt: addDays(now, -2).toISOString(),
        channel: 'SMS',
        actionRequired: false,
        answers: Object.fromEntries([
          answerFor(med, 'I assign my right to Medicare benefits to the provider named above', 'Yes, I consent'),
          answerFor(med, 'Signature', 'Noah Williams'),
        ]),
      },
      med,
    ),
  ]
}

function audit(now: Date): AuditEntry[] {
  const e = (i: number, formId: string, formTitle: string, user: string, daysAgo: number, action: string, changes?: AuditEntry['changes']): AuditEntry => ({
    id: `aud_${i}`,
    formId,
    formTitle,
    user,
    at: addDays(now, -daysAgo).toISOString(),
    action,
    changes,
  })
  return [
    e(1, 'frm_intake', 'Patient Intake Form', 'calley.mccarthy@nexa.com.au', 2, 'Saved draft', [{ field: 'Pages', from: '2', to: '3' }]),
    e(2, 'frm_medicare', 'Medicare AOB Consent', 'kate.sullivan@nexa.com.au', 12, 'Published'),
    e(3, 'frm_checklist', 'Hospital Visit Checklist', 'calley.mccarthy@nexa.com.au', 21, 'Published'),
    e(4, 'frm_checklist', 'Hospital Visit Checklist', 'calley.mccarthy@nexa.com.au', 22, 'Updated settings', [
      { field: 'Trigger', from: 'General (manual access)', to: 'SMS' },
      { field: 'Notification timing', from: '1 day', to: '5 days, 1 day' },
    ]),
    e(5, 'frm_flu', 'Flu Vaccination Clinic Survey', 'james.okafor@nexa.com.au', 25, 'Unpublished'),
    e(6, 'frm_feedback', 'Outpatient Feedback', 'kate.sullivan@nexa.com.au', 60, 'Published'),
  ]
}

export function buildSeed(): DB {
  n = 0
  const now = new Date()
  const forms: Form[] = [
    checklistForm(now),
    feedbackForm(now),
    medicareForm(now),
    intakeForm(now),
    simpleForm(now, {
      id: 'frm_triage',
      title: 'Respiratory Triage Questionnaire',
      description: 'Screens referred patients for urgency before a respiratory clinic is booked.',
      status: 'draft',
      createdBy: 'james.okafor@nexa.com.au',
      category: 'Triage',
      ago: 4,
    }),
    simpleForm(now, {
      id: 'frm_flu',
      title: 'Flu Vaccination Clinic Survey',
      description: 'Feedback from the 2026 staff and community flu vaccination clinics.',
      status: 'unpublished',
      createdBy: 'james.okafor@nexa.com.au',
      category: 'Survey',
      ago: 80,
      extra: { publishedAt: addDays(now, -70).toISOString(), unpublishedAt: addDays(now, -25).toISOString() },
    }),
    simpleForm(now, {
      id: 'frm_winter',
      title: 'Winter Wellness Check',
      description: 'Seasonal check-in for chronic care patients over the winter months.',
      status: 'expired',
      createdBy: 'kate.sullivan@nexa.com.au',
      category: 'Post-Appointment',
      ago: 200,
      extra: { publishedAt: addDays(now, -190).toISOString(), expiredAt: addDays(now, -98).toISOString() },
    }),
    simpleForm(now, {
      id: 'frm_2025',
      title: '2025 Patient Experience Survey',
      description: 'Annual experience survey. Superseded by Outpatient Feedback.',
      status: 'archived',
      createdBy: 'kate.sullivan@nexa.com.au',
      category: 'Survey',
      ago: 400,
      extra: {
        publishedAt: addDays(now, -390).toISOString(),
        unpublishedAt: addDays(now, -120).toISOString(),
        archivedAt: addDays(now, -110).toISOString(),
      },
    }),
  ]
  for (const fm of forms) fm.settings.expiresOn = fm.expiresAt?.slice(0, 10) ?? ''
  return {
    version: 3,
    forms,
    audit: audit(now),
    patients: PATIENTS,
    appointments: appointments(now),
    submissions: submissions(now, forms),
    currentUser: USERS[0].email,
    ctaSnoozedUntil: {},
  }
}
