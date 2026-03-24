# Web Agent Backseat

AI stress-tests browser-agent tasks before you click run.

## What it does

Web Agent Backseat reviews a browser automation task and returns:
- fragile workflow steps
- prompt-injection / phishing traps
- human approval checkpoints
- a safer plan for the run

It uses an OpenRouter free model and renders the result as readable markdown in the UI.

## How to Run (from zero)

1. Prerequisites
   - Node.js 20+
   - npm
   - OpenRouter API key
2. `git clone https://github.com/sundaiclaw/web-agent-backseat.git`
3. `cd web-agent-backseat`
4. `npm install`
5. Run:
   - `OPENROUTER_API_KEY=your_key OPENROUTER_BASE_URL=https://openrouter.ai/api/v1 OPENROUTER_MODEL=google/gemma-3-27b-it:free npm start`
6. Open `http://localhost:8080`

## Limitations / known gaps

- No saved history yet
- No auth/rate limiting
- Advice quality depends on the clarity of the task description
