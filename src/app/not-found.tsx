import Link from "next/link";

/** Review fix (39/50): a URL no route claims used to show Next's bare 404. This page is standalone on purpose —
 * it renders outside the signed-in shell (the root layout carries no portal CSS), so it styles itself. */
export default function NotFound() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#FAFAF9", padding: "24px 16px", fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", sans-serif' }}>
      <div style={{ width: "min(420px, 100%)", background: "#fff", border: "1px solid #ECECEA", borderRadius: 12, padding: "28px 24px", textAlign: "center" }}>
        <p style={{ margin: 0, font: "600 13px/16px inherit", letterSpacing: "2px", color: "#6B6B68" }}>NEVORA</p>
        <h1 style={{ margin: "14px 0 6px", font: "600 22px/28px inherit", color: "#111" }}>There’s no page here</h1>
        <p style={{ margin: "0 0 20px", font: "400 15px/22px inherit", color: "#6B6B68" }}>The link may be old, or the page may have moved.</p>
        <Link href="/app" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 44, padding: "0 20px", borderRadius: 10, background: "#087571", color: "#fff", font: "600 15px/20px inherit", textDecoration: "none" }}>Back to Home</Link>
      </div>
    </main>
  );
}
