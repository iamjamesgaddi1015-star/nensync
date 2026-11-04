import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="auth-shell">
      <div className="panel">
        <h1>This page took a wrong turn.</h1>
        <p>Your daily workspace is right here.</p>
        <Link className="button button-primary" href="/">
          Return to NenSync
        </Link>
      </div>
    </main>
  );
}
