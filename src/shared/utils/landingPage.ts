interface LandingPageOptions {
    name: string;
    apiPrefix: string;
    realtimePath: string;
    env: string;
    timestamp: string;
    uptimeSeconds: number;
}

const escapeHtml = (value: string): string => {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
};

export const renderLandingPage = (options: LandingPageOptions): string => {
    const appName = escapeHtml(options.name);
    const apiPrefix = escapeHtml(options.apiPrefix);
    const realtimePath = escapeHtml(options.realtimePath);
    const env = escapeHtml(options.env);
    const timestamp = escapeHtml(options.timestamp);
    const uptimeSeconds = options.uptimeSeconds.toFixed(2);

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${appName} API</title>
    <style>
      :root {
        color-scheme: light;
        --bg-1: #0b1f33;
        --bg-2: #143f5f;
        --panel: #ffffff;
        --text: #11263b;
        --muted: #4d6478;
        --ok: #0b8f5b;
        --accent: #006fbf;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        color: var(--text);
        background:
          radial-gradient(1200px 700px at 10% 10%, #1d5f8f 0%, transparent 60%),
          radial-gradient(1200px 700px at 90% 90%, #2f8d6d 0%, transparent 55%),
          linear-gradient(135deg, var(--bg-1), var(--bg-2));
        display: grid;
        place-items: center;
        padding: 1.25rem;
      }

      .panel {
        width: min(920px, 100%);
        background: var(--panel);
        border-radius: 18px;
        box-shadow: 0 24px 60px rgba(5, 19, 33, 0.35);
        overflow: hidden;
      }

      .hero {
        padding: 2rem;
        border-bottom: 1px solid #e3edf5;
        background: linear-gradient(90deg, #f4fbff, #f8fffb);
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        color: var(--ok);
        background: #e8fff5;
        padding: 0.35rem 0.7rem;
        border-radius: 999px;
        border: 1px solid #c8f2df;
      }

      h1 {
        margin: 1rem 0 0.35rem;
        font-size: clamp(1.6rem, 4vw, 2.2rem);
      }

      p {
        margin: 0;
        color: var(--muted);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1rem;
        padding: 1.25rem 2rem 2rem;
      }

      .card {
        border: 1px solid #dce8f3;
        border-radius: 12px;
        padding: 1rem;
        background: #fff;
      }

      .card h2 {
        margin: 0 0 0.55rem;
        font-size: 1rem;
      }

      .value {
        font-weight: 600;
        color: var(--text);
      }

      .links {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      a {
        color: var(--accent);
        text-decoration: none;
        font-weight: 600;
      }

      a:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <main class="panel" role="main">
      <section class="hero">
        <span class="badge">System online</span>
        <h1>${appName} API</h1>
        <p>Production-ready backend starter with modular architecture.</p>
      </section>

      <section class="grid">
        <article class="card">
          <h2>Environment</h2>
          <p class="value">${env}</p>
        </article>

        <article class="card">
          <h2>Uptime</h2>
          <p class="value">${uptimeSeconds}s</p>
        </article>

        <article class="card">
          <h2>Server Time</h2>
          <p class="value">${timestamp}</p>
        </article>

        <article class="card">
          <h2>Quick Links</h2>
          <div class="links">
            <a href="/health">GET /health</a>
            <a href="${apiPrefix}/health">GET ${apiPrefix}/health</a>
          </div>
        </article>

        <article class="card">
          <h2>Realtime</h2>
          <p class="value">Socket.IO path: ${realtimePath}</p>
        </article>
      </section>
    </main>
  </body>
</html>`;
};
