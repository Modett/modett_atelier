'use client'

import { useState } from 'react'
import { z } from 'zod'
import Link from 'next/link'
import { ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRegister } from '@/hooks/useRegister'
import { AuthInput } from './AuthInput'
import type { ApiError } from '@/types'

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least 1 capital letter')
    .regex(/[a-z]/, 'Password must contain at least 1 lower letter'),
  title: z.string().min(1, 'Please select a title'),
  firstName: z.string().min(1, 'Please enter your first name'),
  surname: z.string().min(1, 'Please enter your surname'),
})

const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists. Please log in instead.',
  VALIDATION_ERROR:     'Please check your details and try again.',
  RATE_LIMIT_EXCEEDED:  'Too many attempts. Please try again later.',
}

export function RegisterForm({
  onSuccess,
  onSwitchToLogin,
}: RegisterFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [title, setTitle] = useState('')
  const [firstName, setFirstName] = useState('')
  const [surname, setSurname] = useState('')
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [profilingConsent, setProfilingConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const register = useRegister()

  const passwordRules = [
    { met: password.length >= 8, text: 'Minimum 8 Characters' },
    { met: /[A-Z]/.test(password), text: 'At least 1 capital letter' },
    { met: /[a-z]/.test(password), text: 'At least 1 lower letter' },
  ]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    const result = registerSchema.safeParse({
      email,
      password,
      title,
      firstName,
      surname,
    })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[String(err.path[0])] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    register.mutate(
      {
        firstName,
        lastName:        surname,
        email,
        password,
        newsletterOptIn: marketingConsent,
      },
      {
        onSuccess: () => {
          onSuccess()
        },
        onError: (err: Error) => {
          const apiErr = err as unknown as ApiError
          const message = ERROR_MESSAGES[apiErr?.code]
            ?? 'Something went wrong. Please try again.'
          setErrors({ form: message })
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div>
        <h2 className="font-display font-bold text-[28px] text-umber leading-tight mb-2">
          My Modett
        </h2>
        <p className="font-body font-light text-[13px] text-muted-foreground leading-relaxed">
          Please enter your email address to login or create a new profile
        </p>
      </div>

      <p className="font-body font-light text-[11px] text-muted-foreground text-right">
        &middot; Required fields
      </p>

      {errors.form && (
        <div className="font-body text-[12px] text-red-500 -mt-4">
          <p>{errors.form}</p>
          {register.error && (register.error as unknown as ApiError)?.code === 'EMAIL_ALREADY_EXISTS' && (
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="underline text-umber mt-1"
            >
              Log in to your account
            </button>
          )}
        </div>
      )}

      <AuthInput
        label="Email"
        name="register-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />

      <div className="flex flex-col gap-2">
        <AuthInput
          label="Password"
          name="register-password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />

        <div className="pt-1">
          <p className="font-body font-light text-[12px] text-muted-foreground mb-1">
            The password should contain:
          </p>
          <ul className="flex flex-col gap-0.5">
            {passwordRules.map((rule) => (
              <PasswordRule key={rule.text} met={rule.met} text={rule.text} />
            ))}
          </ul>
        </div>
      </div>

      {/* Title select */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="register-title"
          className="font-body font-light text-[12px] tracking-wide text-umber"
        >
          <span className="mr-1">&middot;</span>Title:
        </label>
        <div className="relative">
          <select
            id="register-title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-describedby={errors.title ? 'register-title-error' : undefined}
            aria-invalid={errors.title ? true : undefined}
            className={cn(
              'w-full bg-transparent outline-none appearance-none',
              'font-body font-light text-[16px] md:text-[14px] text-umber',
              'border-0 border-b pb-1 pr-6 cursor-pointer',
              errors.title
                ? 'border-red-400'
                : 'border-muted-foreground focus:border-umber',
              'transition-colors duration-200',
              !title && 'text-muted-foreground/60',
            )}
          >
            <option value="" disabled>
              Select...
            </option>
            <option value="mr">Mr</option>
            <option value="mrs">Mrs</option>
            <option value="ms">Ms</option>
            <option value="dr">Dr</option>
            <option value="prof">Prof</option>
          </select>
          <ChevronDown
            className="absolute right-0 bottom-2 w-4 h-4 text-muted-foreground pointer-events-none"
          />
        </div>
        {errors.title && (
          <p
            id="register-title-error"
            className="font-body text-[11px] text-red-500 mt-0.5"
          >
            {errors.title}
          </p>
        )}
      </div>

      <AuthInput
        label="First name"
        name="register-firstName"
        type="text"
        placeholder="Name"
        required
        autoComplete="given-name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        error={errors.firstName}
      />

      <AuthInput
        label="Surname"
        name="register-surname"
        type="text"
        placeholder="Name"
        required
        autoComplete="family-name"
        value={surname}
        onChange={(e) => setSurname(e.target.value)}
        error={errors.surname}
      />

      {/* Consent checkboxes */}
      <div className="flex flex-col gap-4 pt-2">
        <AuthCheckbox
          id="marketing-consent"
          checked={marketingConsent}
          onChange={setMarketingConsent}
        >
          I wish to receive updates about Modett exclusive products, services and
          activities, through traditional and digital communication methods.
        </AuthCheckbox>

        <AuthCheckbox
          id="profiling-consent"
          checked={profilingConsent}
          onChange={setProfilingConsent}
        >
          I wish to receive tailored recommendations through the profiling of my
          interests, preferences and purchasing habits at Modett.
        </AuthCheckbox>
      </div>

      {/* Legal text */}
      <div className="flex flex-col gap-3">
        <p className="font-body font-light text-[12px] text-muted-foreground leading-relaxed">
          Modett will process your personal data in compliance with the{' '}
          <Link href="/privacy" className="text-umber underline">
            Privacy Notice
          </Link>{' '}
          and you can withdraw the consent indicated above at any time.
        </p>
        <p className="font-body font-light text-[12px] text-muted-foreground leading-relaxed">
          By registering you hereby declare that you are at least 18 years of
          age or older (or the legal minimum age required by your country) and
          that you agree with the{' '}
          <Link href="/terms" className="text-umber underline">
            Terms of Use of the Website
          </Link>
          .
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-2">
        <button
          type="submit"
          disabled={register.isPending}
          className={cn(
            'w-full h-13',
            'bg-transparent border border-umber text-umber',
            'font-body font-light uppercase tracking-[0.25em] text-[13px]',
            'rounded-none',
            'hover:bg-umber hover:text-background',
            'transition-all duration-200',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          {register.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating account...
            </span>
          ) : 'Register'}
        </button>

        <button
          type="button"
          onClick={onSwitchToLogin}
          className={cn(
            'w-full h-13',
            'bg-umber text-background',
            'font-body font-light uppercase tracking-[0.25em] text-[13px]',
            'rounded-none border-0',
            'hover:bg-ink transition-colors duration-200',
          )}
        >
          Login
        </button>
      </div>
    </form>
  )
}

function PasswordRule({ met, text }: PasswordRuleProps) {
  return (
    <li
      className={cn(
        'flex items-center gap-1.5',
        'font-body font-light text-[12px]',
        'transition-colors duration-200',
        met ? 'text-umber' : 'text-muted-foreground',
      )}
    >
      <span>&middot;</span>
      {text}
    </li>
  )
}

function AuthCheckbox({ id, checked, onChange, children }: AuthCheckboxProps) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
      <div className="relative flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={cn(
            'w-4 h-4 border border-muted-foreground',
            'flex items-center justify-center',
            'transition-colors duration-200',
            checked ? 'bg-umber border-umber' : 'bg-transparent',
          )}
        >
          {checked && (
            <svg
              viewBox="0 0 10 8"
              className="w-2.5 h-2 text-background"
              aria-hidden="true"
            >
              <path
                d="M1 4l2.5 2.5L9 1"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
      <span className="font-body font-light text-[12px] text-umber leading-relaxed">
        {children}
      </span>
    </label>
  )
}

interface RegisterFormProps {
  onSuccess:       () => void
  onSwitchToLogin: () => void
}

interface PasswordRuleProps {
  met: boolean
  text: string
}

interface AuthCheckboxProps {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  children: React.ReactNode
}
