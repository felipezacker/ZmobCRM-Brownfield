'use client';

import React from 'react';
import { Button } from '@/app/components/ui/Button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-lg border p-8" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
          <div className="text-center">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Algo deu errado
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {this.state.error?.message || 'Erro inesperado'}
            </p>
          </div>
          <Button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-md px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-foreground)',
            }}
          >
            Tentar novamente
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
