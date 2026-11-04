"use client";
import { Button } from "@/components/primitives";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="auth-shell">
      <div className="panel">
        <h1>We couldn’t open your workspace.</h1>
        <p>
          No action was confirmed. Try again, or return after checking your
          connection.
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
