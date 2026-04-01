'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

// AUDIT FIX: prevent a single admin page render error from blanking the whole shell
export class AdminErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <p className="mb-2 font-medium text-red-600">
            Something went wrong on this page.
          </p>
          <p className="mb-4 text-sm text-gray-500">
            {this.state.error?.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="text-sm text-gray-600 underline"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
