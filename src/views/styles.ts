export const css = `
:root {
  color-scheme: light;
  --bg: #f4efe6;
  --ink: #1c2430;
  --muted: #5b6570;
  --line: #e2d8c8;
  --card: #fffdf8;
  --accent: #0f6e6b;
  --accent-dark: #0b5552;
  --soft: #e7f3ef;
  --warn-bg: #f8ebe3;
  --warn-ink: #6d2e24;
  --good: #1d6b45;
  --shadow: 0 16px 40px rgba(48, 36, 18, 0.06);
  --radius: 20px;
  --sans: "Segoe UI", "Avenir Next", "Trebuchet MS", sans-serif;
  --serif: "Iowan Old Style", Palatino, Georgia, serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  color: var(--ink);
  font-family: var(--sans);
  font-size: 1.05rem;
  line-height: 1.5;
  background:
    radial-gradient(1100px 480px at 8% -10%, #e4f3ee, transparent 55%),
    var(--bg);
}

body.kid {
  background:
    radial-gradient(900px 420px at 50% -12%, #e8f6d4, transparent 58%),
    #f6f3ea;
}

a { color: var(--accent-dark); }
a:hover { color: var(--accent); }

.skip {
  position: absolute;
  left: 1rem;
  top: -4rem;
  background: var(--ink);
  color: white;
  padding: 0.5rem 0.8rem;
  border-radius: 8px;
}
.skip:focus { top: 1rem; }

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  max-width: 1040px;
  margin: 0 auto;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--ink);
  text-decoration: none;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.mark {
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 4px;
  background: var(--accent);
  display: inline-block;
}

.nav {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.nav a, .text-button {
  color: var(--muted);
  text-decoration: none;
  font-size: 0.95rem;
}

.nav form { margin: 0; }

.text-button {
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  font: inherit;
}

.text-button:hover, .nav a:hover { color: var(--ink); }

.wrap {
  width: min(1040px, calc(100% - 2rem));
  margin: 0 auto 3rem;
}

body.kid .wrap { width: min(560px, calc(100% - 1.5rem)); }

.eyebrow {
  margin: 0 0 0.4rem;
  color: var(--accent-dark);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 0.6rem;
  font-family: var(--serif);
  font-size: clamp(2.1rem, 5vw, 3.4rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.08;
}

h2 {
  margin: 0 0 0.4rem;
  font-size: 1.3rem;
  letter-spacing: -0.02em;
}

h3 { margin: 0 0 0.35rem; font-size: 1.05rem; }

.lede, .hint { color: var(--muted); }
.lede { max-width: 38rem; font-size: 1.12rem; }

.grid {
  display: grid;
  gap: 1rem;
  margin-top: 1.5rem;
}

@media (min-width: 800px) {
  .split { grid-template-columns: 1fr 1fr; }
  .dashboard { grid-template-columns: 1fr 1fr; }
  .span-2 { grid-column: 1 / -1; }
}

.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 1.2rem 1.2rem 1.3rem;
}

.card p { margin: 0.3rem 0 0.9rem; }

.actions, .stack { display: flex; flex-wrap: wrap; gap: 0.6rem; }

label { display: block; margin: 0 0 0.8rem; }
label span, .legend {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.92rem;
  font-weight: 650;
}

input, select {
  width: 100%;
  font: inherit;
  color: inherit;
  background: white;
  border: 1px solid #d9d0c2;
  border-radius: 12px;
  padding: 0.75rem 0.8rem;
}

.button, button.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0.7rem 1rem;
  border-radius: 12px;
  border: 1px solid transparent;
  background: var(--accent);
  color: white;
  font: inherit;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.button:hover { background: var(--accent-dark); }
.button.quiet {
  background: transparent;
  color: var(--ink);
  border-color: #d5cbbd;
}
.button.quiet:hover { background: #f7f1e6; }
.button.submit { width: 100%; min-height: 64px; font-size: 1.2rem; margin-top: 0.4rem; }

.banner {
  background: var(--warn-bg);
  color: var(--warn-ink);
  border-radius: 12px;
  padding: 0.75rem 0.9rem;
  margin: 0 0 0.9rem;
}

.child-list, .set-list, .score-list, .recap {
  list-style: none;
  padding: 0;
  margin: 0.4rem 0 0;
}

.child-list li, .set-list li, .score {
  padding: 0.7rem 0;
  border-top: 1px solid var(--line);
}

.child-name { font-weight: 700; }

.score {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.8rem;
  align-items: baseline;
  justify-content: space-between;
}

.score-meta, .set-meta { color: var(--muted); }

.generate-grid, .inline-fields { display: grid; gap: 0.75rem; }
@media (min-width: 700px) {
  .generate-grid { grid-template-columns: 1.3fr 1fr 7rem auto; align-items: end; }
  .inline-fields { grid-template-columns: 1fr 9rem auto; align-items: end; }
  .generate-grid label, .inline-fields label { margin: 0; }
}

.progress {
  margin: 0.2rem 0 0.4rem;
  color: var(--muted);
  font-weight: 700;
  letter-spacing: 0.02em;
}

.track {
  height: 8px;
  background: #e6e0d4;
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 1.2rem;
}

.fill { height: 100%; background: var(--accent); }

.equation {
  margin: 0.2rem 0 1rem;
  text-align: center;
  font-family: var(--serif);
  font-size: clamp(3.1rem, 14vw, 5.6rem);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.04em;
  line-height: 1.05;
}

.answer-form { max-width: 420px; margin: 0 auto; }
.answer-label span { text-align: center; }
.answer-input {
  font-family: var(--serif);
  font-size: 2.4rem;
  text-align: center;
  min-height: 76px;
  margin-bottom: 0.8rem;
}

.pad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.65rem;
}

.pad button {
  min-height: 68px;
  border-radius: 16px;
  border: 1px solid #ddd4c6;
  background: white;
  color: var(--ink);
  font: inherit;
  font-size: 1.6rem;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  box-shadow: 0 1px 0 rgba(40, 30, 10, 0.04);
}

.pad button:hover { background: var(--soft); }
.pad button:active { transform: translateY(1px); }

.feedback { text-align: center; }
.feedback .verdict { font-size: 1.35rem; font-weight: 750; margin: 0 0 0.4rem; }
.feedback .verdict.good { color: var(--good); }
.feedback .verdict.miss { color: #8a5a12; }
.feedback .detail { color: var(--muted); margin-bottom: 1.2rem; }

.score-hero { text-align: center; padding: 1rem 0 0.4rem; }
.score-hero .score-value {
  font-family: var(--serif);
  font-size: clamp(4rem, 16vw, 6rem);
  letter-spacing: -0.04em;
  line-height: 0.95;
  margin: 0;
}
.score-hero p { color: var(--muted); }

.recap li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.55rem 0;
  border-top: 1px solid var(--line);
  font-variant-numeric: tabular-nums;
}
.recap .good { color: var(--good); }
.recap .miss { color: #8a5a12; }

:focus-visible {
  outline: 3px solid #0f6e6b;
  outline-offset: 2px;
}

@media (max-width: 640px) {
  .top { padding-inline: 0.8rem; }
  .wrap { width: min(100% - 1.4rem, 1040px); }
  .pad button { min-height: 64px; }
}
`;
