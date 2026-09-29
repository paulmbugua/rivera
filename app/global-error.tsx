"use client";

import { useEffect } from "react";
import { captureFrontendError } from "@/lib/error-monitoring";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureFrontendError(error, {
      route: typeof window === "undefined" ? undefined : window.location.pathname,
      requestId: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main style={{ maxWidth: 560, margin: "10vh auto", padding: 24 }}>
          <h1>Rivera hit an unexpected problem</h1>
          <p>Your information is safe. Try the page again, or contact support if the problem continues.</p>
          <button type="button" onClick={reset}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
