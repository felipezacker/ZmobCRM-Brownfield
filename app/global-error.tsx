"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

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
    <html>
      <body>
        <h2>Something went wrong!</h2>
        {/* eslint-disable-next-line no-restricted-syntax -- global-error renders outside app layout, no design system available */}
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
