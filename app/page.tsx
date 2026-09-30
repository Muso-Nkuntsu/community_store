// Placeholder home page. The frontend team replaces this file.
export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 24, maxWidth: 640 }}>
      <h1>Community Store - backend running</h1>
      <p>
        The API is available under <code>/api</code>. Try <a href="/api/health">/api/health</a> or{" "}
        <a href="/api/listings">/api/listings</a>.
      </p>
      <p>See docs/API.md for every endpoint.</p>
    </main>
  );
}
