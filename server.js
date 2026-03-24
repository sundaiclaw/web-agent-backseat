import express from 'express';
import { marked } from 'marked';

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 8080;
const BASE = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const MODEL = process.env.OPENROUTER_MODEL || 'google/gemma-3-27b-it:free';

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Web Agent Backseat</title>
  <style>
    :root { color-scheme: dark; }
    body { margin:0; font-family: Inter, system-ui, sans-serif; background: radial-gradient(circle at top,#1e1b4b,#020617 70%); color:#e2e8f0; }
    .wrap { max-width: 1050px; margin: 0 auto; padding: 30px 18px 60px; }
    .hero { margin-bottom: 22px; }
    h1 { margin: 0 0 8px; font-size: clamp(2.4rem, 6vw, 4rem); }
    .lead { color:#cbd5e1; max-width: 760px; }
    .grid { display:grid; grid-template-columns: 1.15fr .85fr; gap:18px; }
    .card { background: rgba(15,23,42,.85); border:1px solid rgba(148,163,184,.2); border-radius:18px; padding:18px; box-shadow: 0 18px 40px rgba(0,0,0,.25); }
    textarea,input { width:100%; box-sizing:border-box; border-radius:14px; border:1px solid #334155; background:#020617; color:#e2e8f0; padding:14px; }
    textarea { min-height: 180px; resize: vertical; }
    input { margin-top: 10px; }
    button { margin-top: 12px; background:#22c55e; color:#052e16; border:0; border-radius:12px; padding:12px 16px; font-weight:800; cursor:pointer; }
    .chips { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
    .chip { background:#0f172a; border:1px solid #334155; color:#93c5fd; padding:6px 10px; border-radius:999px; font-size:.85rem; }
    #status { min-height: 24px; color:#86efac; }
    #output { line-height:1.6; }
    #output h1,#output h2,#output h3 { color:#a5f3fc; }
    #output code { background:#0f172a; padding:2px 6px; border-radius:6px; }
    #output pre { background:#020617; border-radius:12px; padding:14px; overflow:auto; }
    @media (max-width: 820px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <div class="chips">
        <span class="chip">Browser-agent planning</span>
        <span class="chip">Prompt-injection traps</span>
        <span class="chip">Human checkpoint design</span>
      </div>
      <h1>Web Agent Backseat</h1>
      <p class="lead">Paste a browser task you want an agent to run. Get the fragile steps, likely failure modes, injection traps, and the exact moments a human should take the wheel.</p>
    </section>
    <section class="grid">
      <div class="card">
        <label>Browser task</label>
        <textarea id="task" placeholder="Example: Log into Shopify, export yesterday's failed payments, open Stripe, refund duplicate charges under $20, then draft a Slack summary."></textarea>
        <label>What is the worst possible mistake?</label>
        <input id="risk" placeholder="Example: refunding real customers by mistake or leaking internal data" />
        <button onclick="analyzeTask()">Analyze workflow risk</button>
        <p id="status"></p>
      </div>
      <div class="card">
        <h3>What it returns</h3>
        <ul>
          <li>step-by-step fragility map</li>
          <li>prompt-injection / phishing traps</li>
          <li>human approval checkpoints</li>
          <li>a safer operating plan for the run</li>
        </ul>
        <p>This uses a real OpenRouter free model and renders the answer as formatted markdown.</p>
      </div>
    </section>
    <section class="card" style="margin-top:18px;">
      <h3>Agent run review</h3>
      <div id="output">Your AI-generated review will appear here.</div>
    </section>
  </div>
  <script>
    async function analyzeTask() {
      const task = document.getElementById('task').value.trim();
      const risk = document.getElementById('risk').value.trim();
      if (!task) return;
      document.getElementById('status').textContent = 'Scanning the workflow...';
      document.getElementById('output').innerHTML = '<p>Working...</p>';
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, risk })
      });
      const data = await res.json();
      if (!res.ok) {
        document.getElementById('status').textContent = 'Request failed';
        document.getElementById('output').textContent = data.error || 'Unknown error';
        return;
      }
      document.getElementById('status').textContent = 'Done with ' + data.model;
      document.getElementById('output').innerHTML = data.html;
    }
  </script>
</body>
</html>`;

app.get('/', (_req, res) => res.type('html').send(html));
app.get('/healthz', (_req, res) => res.json({ ok: true, model: MODEL }));

app.post('/api/analyze', async (req, res) => {
  try {
    const task = (req.body?.task || '').slice(0, 9000);
    const risk = (req.body?.risk || '').slice(0, 500);
    if (!task) return res.status(400).json({ error: 'task required' });
    if (!process.env.OPENROUTER_API_KEY) return res.status(500).json({ error: 'OPENROUTER_API_KEY missing' });

    const prompt = `You are Web Agent Backseat, a sharp operator reviewing browser-agent workflows before execution.

Task to review:
${task}

Worst possible mistake to emphasize: ${risk || 'not provided'}

Return markdown with these exact sections:
# Mission Summary
# Fragile Steps
# Injection / Phishing Traps
# Human Checkpoints
# Safer Plan
# If This Goes Wrong First

Rules:
- Be specific to the workflow.
- Assume the agent can click, type, upload, download, and read page text.
- Call out pages or moments where the agent could be socially engineered.
- Include at least 3 human checkpoints.
- No filler intro.
`;

    const r = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://web-agent-backseat.local',
        'X-Title': 'Web Agent Backseat'
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.35,
        messages: [
          { role: 'system', content: 'You produce concise, high-signal browser-automation risk reviews in markdown.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: data?.error?.message || 'LLM request failed', raw: data });
    const markdown = data?.choices?.[0]?.message?.content || 'No response';
    res.json({ markdown, html: marked.parse(markdown), model: MODEL });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.listen(PORT, () => console.log(`listening on ${PORT}`));
