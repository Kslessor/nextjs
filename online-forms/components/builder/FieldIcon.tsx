import { AlignLeft, Calendar, CircleDot, Hash, IdCard, ListFilter, Mail, Phone, Smile, SquareCheck, Type, Upload } from 'lucide-react'
import type { FieldType } from '@/lib/types'

const ICONS: Record<FieldType, typeof Type> = {
  short_text: Type,
  long_text: AlignLeft,
  number: Hash,
  email: Mail,
  phone: Phone,
  date: Calendar,
  dropdown: ListFilter,
  radio: CircleDot,
  checkboxes: SquareCheck,
  smiley: Smile,
  file: Upload,
  dynamic: IdCard,
}

export function FieldIcon({ type, className = 'h-4 w-4' }: { type: FieldType; className?: string }) {
  const I = ICONS[type]
  return <I className={className} />
}
