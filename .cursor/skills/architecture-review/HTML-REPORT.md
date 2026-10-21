# HTML report format (architecture review)

Render the review as one self-contained HTML file in the OS temp directory. Use
Tailwind and Mermaid from CDNs. Do not commit the file to the repo.

## Temp file path

```
{TEMP}/architecture-review-{YYYYMMDD-HHMMSS}.html
```

- Windows: `%TEMP%` (e.g. `C:\Users\...\AppData\Local\Temp\...`)
- macOS/Linux: `$TMPDIR` or `/tmp`

After writing, open when possible and print the absolute path to the user.

## Scaffold

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Architecture review</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      .seam { stroke-dasharray: 4 4; }
      .leak { stroke: #dc2626; }
      .deep { background: linear-gradient(135deg, #0f172a, #1e293b); }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <header>...</header>
      <section id="candidates" class="space-y-10">...</section>
      <section id="top-recommendation">...</section>
    </main>
  </body>
</html>
```

## Header

- Title: `Architecture review`
- Date, scope (e.g. `apps/<name>`, `packages/<name>`)
- Legend: solid box = module, dashed = seam, red = leakage, dark thick = deep module
- No intro paragraph — straight to candidates

## Candidate card

- **Title** — names the deepening (domain words from CONTEXT.md)
- **Badges** — strength (`Strong` emerald, `Worth exploring` amber, `Speculative` slate);
  dependency tag: `in-process` | `local-substitutable` | `ports-adapters` | `mock`
- **Files** — `font-mono text-sm`
- **Before / After** — side by side (~320px tall)
- **Problem** — one sentence
- **Solution** — one sentence
- **Wins** — ≤6 words per bullet
- **ADR callout** (optional) — amber box when contradicting an accepted ADR

Use [LANGUAGE.md](LANGUAGE.md) terms. Use CONTEXT.md for domain nouns.

## Diagram patterns

- **Mermaid flowchart** — call graphs, leakage edges (`classDef leak`)
- **Hand-built boxes** — one deep module with greyed internals
- **Cross-section** — thin layers before, one thick band after
- **Mass diagram** — interface height vs implementation height (shallow vs deep)

## Top recommendation

One card: candidate name, one sentence why first, anchor link to card.

## Tone

Plain, concise. No hedging. If a sentence could be a bullet, bullet it.

**Use:** module, interface, depth, seam, adapter, leverage, locality.  
**Avoid in wins:** "cleaner", "easier to maintain" without glossary tie-in.
