"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * GlobalError renders outside the root layout, so Tailwind/globals.css
 * are NOT available. All styling MUST be inline.
 *
 * Design: ZmobCRM branding (sky-blue accent, Inter font stack),
 * friendly error message, retry button, and report link.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      Sentry.captureException(error);
    } catch {
      // Sentry may not be initialized; silently ignore
    }
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          backgroundColor: "#020617",
          color: "#f8fafc",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          {/* Icon */}
          <div
            style={{
              width: "3.5rem",
              height: "3.5rem",
              borderRadius: "1rem",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              fontSize: "1.75rem",
            }}
            aria-hidden="true"
          >
            !
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              margin: "0 0 0.5rem",
              letterSpacing: "-0.02em",
            }}
          >
            Algo deu errado
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: "0.875rem",
              color: "#94a3b8",
              margin: "0 0 1.5rem",
              lineHeight: 1.5,
            }}
          >
            Ocorreu um erro critico na aplicacao. Voce pode tentar recarregar ou reportar o problema.
          </p>

          {/* Error digest */}
          {error.digest && (
            <p
              style={{
                fontSize: "0.75rem",
                fontFamily: "monospace",
                color: "#64748b",
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: "0.5rem",
                padding: "0.5rem 0.75rem",
                margin: "0 0 1.5rem",
              }}
            >
              Codigo: {error.digest}
            </p>
          )}

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {/* eslint-disable-next-line no-restricted-syntax -- global-error renders outside app layout, no design system available */}
            <button
              type="button"
              onClick={() => reset()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.625rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#020617",
                backgroundColor: "#0ea5e9",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                transition: "background-color 0.15s",
              }}
              onMouseOver={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = "#0284c7"; }}
              onMouseOut={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = "#0ea5e9"; }}
            >
              Tentar novamente
            </button>

            <a
              href={`mailto:suporte@zmobcrm.com?subject=${encodeURIComponent("Erro critico na aplicacao")}&body=${encodeURIComponent(`Erro: ${error.message}\nDigest: ${error.digest || "N/A"}`)}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.625rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#e2e8f0",
                backgroundColor: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0.5rem",
                cursor: "pointer",
                textDecoration: "none",
                transition: "background-color 0.15s",
              }}
              onMouseOver={(e) => { (e.target as HTMLAnchorElement).style.backgroundColor = "rgba(255,255,255,0.05)"; }}
              onMouseOut={(e) => { (e.target as HTMLAnchorElement).style.backgroundColor = "transparent"; }}
            >
              Reportar problema
            </a>
          </div>

          {/* Branding */}
          <p
            style={{
              marginTop: "2rem",
              fontSize: "0.75rem",
              color: "rgba(148, 163, 184, 0.4)",
            }}
          >
            ZmobCRM
          </p>
        </div>
      </body>
    </html>
  );
}
