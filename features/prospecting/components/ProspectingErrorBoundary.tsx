'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProspectingErrorBoundaryProps {
  section: string
  children: React.ReactNode
}

interface ProspectingErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ProspectingErrorBoundary extends React.Component<
  ProspectingErrorBoundaryProps,
  ProspectingErrorBoundaryState
> {
  constructor(props: ProspectingErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ProspectingErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ProspectingErrorBoundary] Erro em "${this.props.section}":`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-center">
          <AlertTriangle size={24} className="text-red-500" />
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Erro ao carregar {this.props.section}
          </p>
          <Button
            variant="unstyled"
            size="unstyled"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 text-red-700 dark:text-red-300 transition-colors"
          >
            <RefreshCw size={14} />
            Tentar novamente
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
