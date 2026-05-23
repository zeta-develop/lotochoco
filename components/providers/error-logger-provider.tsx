"use client";

import { Component, useEffect } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { recordAppError } from "@/services/error-logger";
import { AlertTriangle, RotateCcw } from "lucide-react";

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  state: { hasError: boolean; error?: Error } = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    void recordAppError(error, {
      source: 'react-error-boundary',
      severity: 'fatal',
      details: errorInfo.componentStack ?? undefined,
    });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-lg space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-destructive/10 p-3 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">La aplicación encontró un error</h1>
              <p className="text-sm text-muted-foreground">
                El detalle se guardó localmente para poder revisarlo después.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground break-words">
            {this.state.error?.message ?? 'Error inesperado'}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => window.location.reload()} className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reiniciar aplicación
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export function ErrorLoggerProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const originalConsoleError = console.error.bind(console);

    console.error = (...args: unknown[]) => {
      const firstArg = args[0];
      const secondArg = args[1];

      if (firstArg instanceof Error) {
        void recordAppError(firstArg, {
          source: 'console.error',
          severity: 'error',
          details: args.slice(1).map((item) => String(item)).join(' | '),
        });
      } else if (secondArg instanceof Error) {
        void recordAppError(secondArg, {
          source: 'console.error',
          severity: 'error',
          details: String(firstArg),
        });
      } else if (typeof firstArg === 'string') {
        void recordAppError(firstArg, {
          source: 'console.error',
          severity: 'error',
          details: args.slice(1).map((item) => String(item)).join(' | '),
        });
      }

      originalConsoleError(...args);
    };

    const handleWindowError = (event: ErrorEvent) => {
      const normalizedError = event.error ?? new Error(event.message);

      void recordAppError(normalizedError, {
        source: 'window.error',
        severity: 'fatal',
        details: event.filename ? `${event.filename}:${event.lineno ?? 0}:${event.colno ?? 0}` : undefined,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      void recordAppError(event.reason, {
        source: 'unhandledrejection',
        severity: 'fatal',
      });
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      console.error = originalConsoleError;
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return <AppErrorBoundary>{children}</AppErrorBoundary>;
}
