'use client'

import { useState } from 'react'
import { Mail, MapPin, Phone } from 'lucide-react'
import { FilledButton, TextInput } from '@modett/ui'
import { api } from '@/lib/api'
import { CONTACT } from '@/lib/contact'
import type { ApiError } from '@/types'

function isValidEmail(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
}

export function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitError('')

    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    setEmailError('')

    setIsPending(true)
    try {
      await api.post('/messaging/contact', {
        name,
        email: email.trim(),
        message,
      })
      setSubmitted(true)
    } catch (err) {
      // TODO: wire to real backend when /messaging/contact exists
      const status = (err as ApiError)?.status
      if (status === 404) {
        setSubmitted(true)
        return
      }
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="max-w-page mx-auto px-5 md:px-10 py-16 md:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-12 lg:gap-20 lg:items-start">
        <div>
          <h1 className="font-display font-bold text-[32px] md:text-[40px] text-umber leading-tight mb-8 md:mb-10">
            Get In Touch
          </h1>

          {submitted ? (
            <div className="py-12 text-center lg:text-left">
              <p className="font-display font-bold text-[22px] text-umber mb-3">
                Thank you for reaching out.
              </p>
              <p className="font-body font-light text-[14px] text-muted-foreground leading-relaxed">
                We’ll get back to you at {email.trim()} within 1–2 business days.
              </p>
            </div>
          ) : (
            <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
              <TextInput
                label="Name"
                name="name"
                placeholder="Name"
                fullWidth
                size="md"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <TextInput
                label="Email"
                name="email"
                type="email"
                placeholder="Email"
                required
                fullWidth
                size="md"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError('')
                }}
                error={emailError}
              />

              <div className="flex flex-col gap-y-2 w-full">
                <label
                  htmlFor="message"
                  className="font-body font-normal text-text text-sm"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  placeholder="Message"
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full font-body font-normal text-text
                             bg-background border border-muted-foreground/60
                             rounded-sm px-4 py-3 text-base
                             placeholder:text-muted-foreground/50
                             outline-none transition-colors duration-200
                             focus:border-muted-foreground
                             focus:ring-2 focus:ring-highlight/30
                             resize-none min-h-[140px]"
                />
              </div>

              <div>
                <FilledButton
                  type="submit"
                  variant="deep"
                  size="md"
                  fullWidth
                  isLoading={isPending}
                  loadingText="Sending..."
                  disabled={isPending}
                >
                  Send Message
                </FilledButton>
                {submitError ? (
                  <p className="font-body font-light text-[13px] text-red-500 mt-2">
                    {submitError}
                  </p>
                ) : null}
              </div>
            </form>
          )}
        </div>

        <div className="pt-8 border-t border-muted lg:pt-0 lg:border-t-0">
          <h2 className="font-display font-bold text-[32px] md:text-[40px] text-umber leading-tight mb-8 md:mb-10">
            Support
          </h2>

          <div className="flex flex-col">
            <div className="flex items-start gap-4 py-6 border-b border-muted">
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Phone className="w-5 h-5 text-umber" aria-hidden />
              </div>
              <div>
                <p className="font-body font-medium text-[14px] text-umber mb-1">Phone</p>
                <a
                  href={CONTACT.phone.href}
                  className="font-body font-light text-[14px] text-muted-foreground hover:text-umber transition-colors duration-200"
                >
                  {CONTACT.phone.display}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4 py-6 border-b border-muted">
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail className="w-5 h-5 text-umber" aria-hidden />
              </div>
              <div>
                <p className="font-body font-medium text-[14px] text-umber mb-1">Email</p>
                <a
                  href={CONTACT.email.href}
                  className="font-body font-light text-[14px] text-muted-foreground hover:text-umber transition-colors duration-200"
                >
                  {CONTACT.email.display}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4 py-6">
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-5 h-5 text-umber" aria-hidden />
              </div>
              <div>
                <p className="font-body font-medium text-[14px] text-umber mb-1">Address</p>
                <a
                  href={CONTACT.address.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body font-light text-[14px] text-muted-foreground hover:text-umber transition-colors duration-200"
                >
                  {CONTACT.address.display}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
