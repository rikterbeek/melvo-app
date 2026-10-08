import { useState, type ChangeEvent, type FocusEvent, type FormEvent } from 'react'
import { t, type StringKey } from '../strings'

export interface ContactMessage {
  name: string
  email: string
  message: string
}

type FieldName = keyof ContactMessage

type Errors = Partial<Record<FieldName, StringKey>>

interface ContactProps {
  /** Receives a valid message. Defaults to a no-op: the page has no backend yet. */
  send?: (message: ContactMessage) => void
}

/** Plausibility check only — the authoritative check belongs to whatever finally delivers the mail. */
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const fields = [
  { name: 'name', label: 'contact.field.name', multiline: false, type: 'text' },
  { name: 'email', label: 'contact.field.email', multiline: false, type: 'email' },
  { name: 'message', label: 'contact.field.message', multiline: true, type: 'text' },
] as const satisfies readonly {
  name: FieldName
  label: StringKey
  multiline: boolean
  type: string
}[]

const empty: ContactMessage = { name: '', email: '', message: '' }

function validateField(name: FieldName, value: string): StringKey | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return `contact.error.${name}.required`
  if (name === 'email' && !emailPattern.test(trimmed)) return 'contact.error.email.invalid'
  return undefined
}

/** Errors keyed by field, in the order the fields are rendered. */
function validateAll(values: ContactMessage): Errors {
  const found: Errors = {}
  for (const field of fields) {
    const error = validateField(field.name, values[field.name])
    if (error) found[field.name] = error
  }
  return found
}

function trimAll(values: ContactMessage): ContactMessage {
  return { name: values.name.trim(), email: values.email.trim(), message: values.message.trim() }
}

export function Contact({ send }: ContactProps = {}) {
  const [values, setValues] = useState<ContactMessage>(empty)
  const [errors, setErrors] = useState<Errors>({})
  const [sent, setSent] = useState(false)

  function revalidate(name: FieldName, value: string) {
    setErrors((previous) => ({ ...previous, [name]: validateField(name, value) }))
  }

  function handleChange(name: FieldName) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target
      setValues((previous) => ({ ...previous, [name]: value }))
      revalidate(name, value)
    }
  }

  function handleBlur(name: FieldName) {
    return (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      revalidate(name, event.target.value)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validateAll(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    send?.(trimAll(values))
    setSent(true)
  }

  if (sent) {
    return (
      <section>
        <div role="status">
          <h1>{t('contact.success.title')}</h1>
          <p>{t('contact.success.body')}</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h1>{t('contact.title')}</h1>
      <p>{t('contact.intro')}</p>
      <form onSubmit={handleSubmit} noValidate>
        {fields.map((field) => (
          <ContactField
            key={field.name}
            field={field}
            value={values[field.name]}
            error={errors[field.name]}
            onChange={handleChange(field.name)}
            onBlur={handleBlur(field.name)}
          />
        ))}
        <button type="submit">{t('contact.submit')}</button>
      </form>
    </section>
  )
}

interface ContactFieldProps {
  field: (typeof fields)[number]
  value: string
  error: StringKey | undefined
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onBlur: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

function ContactField({ field, value, error, onChange, onBlur }: ContactFieldProps) {
  const errorId = `${field.name}-error`
  const shared = {
    id: field.name,
    name: field.name,
    value,
    onChange,
    onBlur,
    required: true,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
  }

  return (
    <div className="field">
      <label htmlFor={field.name}>{t(field.label)}</label>
      {field.multiline ? <textarea {...shared} /> : <input type={field.type} {...shared} />}
      {error && (
        <p className="field-error" id={errorId} role="alert">
          {t(error)}
        </p>
      )}
    </div>
  )
}
