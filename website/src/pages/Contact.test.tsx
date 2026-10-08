import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Contact } from './Contact'
import { strings } from '../strings'
import { intent } from '../test/intent'

function renderContact(send = vi.fn()) {
  const user = userEvent.setup()
  render(<Contact send={send} />)
  return { user, send }
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  values: { name?: string; email?: string; message?: string },
) {
  if (values.name) await user.type(screen.getByLabelText(strings['contact.field.name']), values.name)
  if (values.email)
    await user.type(screen.getByLabelText(strings['contact.field.email']), values.email)
  if (values.message)
    await user.type(screen.getByLabelText(strings['contact.field.message']), values.message)
}

function submit(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getByRole('button', { name: strings['contact.submit'] }))
}

const valid = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'Hello there.' }

describe('Contact page', () => {
  it(intent('R3', 'renders required name, email and message fields'), () => {
    renderContact()

    expect(screen.getByLabelText(strings['contact.field.name'])).toBeRequired()
    expect(screen.getByLabelText(strings['contact.field.email'])).toBeRequired()
    expect(screen.getByLabelText(strings['contact.field.message'])).toBeRequired()
  })

  it(intent('R1', 'a valid submission shows a success confirmation'), async () => {
    const { user } = renderContact()

    await fillForm(user, valid)
    await submit(user)

    expect(screen.getByRole('status')).toHaveTextContent(strings['contact.success.body'])
    expect(
      screen.getByRole('heading', { name: strings['contact.success.title'] }),
    ).toBeInTheDocument()
  })

  it(intent('R1', 'a valid submission sends the trimmed field values once'), async () => {
    const { user, send } = renderContact()

    await fillForm(user, { ...valid, name: '  Ada Lovelace  ' })
    await submit(user)

    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(valid)
  })

  it(intent('R1', 'the form is replaced by the confirmation after a valid submission'), async () => {
    const { user } = renderContact()

    await fillForm(user, valid)
    await submit(user)

    expect(
      screen.queryByRole('button', { name: strings['contact.submit'] }),
    ).not.toBeInTheDocument()
  })

  it(intent('R2', 'submitting an empty form shows an inline error naming every field'), async () => {
    const { user, send } = renderContact()

    await submit(user)

    const errors = screen.getAllByRole('alert').map((node) => node.textContent)
    expect(errors).toEqual([
      strings['contact.error.name.required'],
      strings['contact.error.email.required'],
      strings['contact.error.message.required'],
    ])
    expect(send).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it(intent('R2', 'a whitespace-only required field counts as empty'), async () => {
    const { user, send } = renderContact()

    await fillForm(user, { ...valid, message: '   ' })
    await submit(user)

    expect(screen.getByRole('alert')).toHaveTextContent(strings['contact.error.message.required'])
    expect(send).not.toHaveBeenCalled()
  })

  it.each(['ada', 'ada@', 'ada@example', '@example.com', 'ada example@com'])(
    intent('R2', 'rejects the implausible email address %s'),
    async (email) => {
      const { user, send } = renderContact()

      await fillForm(user, { ...valid, email })
      await submit(user)

      expect(screen.getByRole('alert')).toHaveTextContent(strings['contact.error.email.invalid'])
      expect(send).not.toHaveBeenCalled()
    },
  )

  it(intent('R2', 'each inline error is announced by its own field'), async () => {
    const { user } = renderContact()

    await submit(user)

    const email = screen.getByLabelText(strings['contact.field.email'])
    expect(email).toHaveAccessibleDescription(strings['contact.error.email.required'])
    expect(email).toHaveAttribute('aria-invalid', 'true')
  })

  it(intent('R2', 'an inline error appears when a required field is left on blur'), async () => {
    const { user, send } = renderContact()

    await user.click(screen.getByLabelText(strings['contact.field.name']))
    await user.tab()

    expect(screen.getByRole('alert')).toHaveTextContent(strings['contact.error.name.required'])
    expect(send).not.toHaveBeenCalled()
  })

  it(intent('R2', 'correcting a field clears its inline error'), async () => {
    const { user } = renderContact()

    await submit(user)
    await fillForm(user, { name: valid.name })

    expect(screen.queryByText(strings['contact.error.name.required'])).not.toBeInTheDocument()
    expect(screen.getByText(strings['contact.error.email.required'])).toBeInTheDocument()
  })

  it(intent('R2', 'a corrected form submits successfully on the second attempt'), async () => {
    const { user, send } = renderContact()

    await submit(user)
    await fillForm(user, valid)
    await submit(user)

    expect(send).toHaveBeenCalledWith(valid)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it(intent('R4', 'the form works without a send handler supplied'), async () => {
    const user = userEvent.setup()
    render(<Contact />)

    await fillForm(user, valid)
    await submit(user)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
