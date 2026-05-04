# Jira Ticket Reviewer – Forge Plugin

## Project overview

Build a Jira Forge app that renders an AI-powered side panel inside Jira's ticket creation view. The panel analyzes the ticket in real time as the user types, using the OpenAI API. The API key is stored per user via Atlassian's encrypted storage and configured through a dedicated settings view.


### 3. AI prompt

Handles system prompt and serializing ticket fields into a compact string for the API.

```js
export const SYSTEM_PROMPT = `You are a senior product owner reviewing a Jira ticket in real time.
Return ONLY valid JSON. No markdown, no code fences.

Schema:
{
  "score": <integer 0-100>,
  "label": <"Poor" | "Needs work" | "Good" | "Excellent">,
  "findings": [
    { "status": <"ok" | "warn" | "err">, "field": "<short field name>", "msg": "<specific actionable feedback>" }
  ],
  "suggestion": "<one concrete improved acceptance criterion string, or empty string>"
}

Rules:
- Return 2–5 findings covering: title clarity, user story format (if type=story), description completeness, AC testability, missing story points, edge cases.
- suggestion should be a ready-to-use Given/When/Then AC string based on the weakest existing criterion.
- If a field is empty, flag it as err.
- Be specific – reference actual content from the ticket.`;

export function serializeTicket({ type, title, story, steps, expected, description, acs, priority, points }) {
  let text = `Type: ${type}\nTitle: ${title || "(empty)"}\n`;
  if (type === "story") text += `User story: ${story || "(empty)"}\n`;
  if (type === "bug") text += `Steps to reproduce: ${steps || "(empty)"}\nExpected vs actual: ${expected || "(empty)"}\n`;
  text += `Description: ${description || "(empty)"}\n`;
  text += `Acceptance criteria: ${acs.length ? acs.join(" | ") : "(none)"}\n`;
  text += `Priority: ${priority}\nStory points: ${points || "(empty)"}`;
  return text;
}
```

### 4. src/useStorage.js

Wraps Forge's `storage` API for reading and writing the user's settings.

```js
import { useState, useEffect } from "react";
import { invoke } from "@forge/bridge";

export function useStorage(key, defaultValue) {
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke("getStorageValue", { key }).then((val) => {
      if (val !== null && val !== undefined) setValue(val);
      setLoading(false);
    });
  }, [key]);

  const save = async (newVal) => {
    setValue(newVal);
    await invoke("setStorageValue", { key, value: newVal });
  };

  return [value, save, loading];
}
```

Add corresponding Forge resolver functions in `src/resolvers/index.js`:

```js
import Resolver from "@forge/resolver";
import { storage } from "@forge/api";

const resolver = new Resolver();

resolver.define("getStorageValue", async ({ payload, context }) => {
  const userKey = `${context.accountId}:${payload.key}`;
  return await storage.getSecret(userKey);
});

resolver.define("setStorageValue", async ({ payload, context }) => {
  const userKey = `${context.accountId}:${payload.key}`;
  await storage.setSecret(userKey, payload.value);
});

export const handler = resolver.getDefinitions();
```

> Use `storage.setSecret` / `storage.getSecret` for the API key – this ensures it is encrypted at rest in Atlassian's infrastructure.

### 5. src/useAnalysis.js

Debounce logic and OpenAI call. Runs entirely in the Forge backend (never exposes the key to the browser).

```js
import { useEffect, useRef, useState } from "react";
import { invoke } from "@forge/bridge";
import { serializeTicket } from "./prompts";

export function useAnalysis(ticket, apiKey, model, debounceMs) {
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | waiting | analyzing | error
  const timer = useRef(null);

  useEffect(() => {
    if (!apiKey) return;
    setStatus("waiting");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setStatus("analyzing");
      try {
        const ticketText = serializeTicket(ticket);
        const data = await invoke("analyzeTicket", { ticketText, apiKey, model });
        setResult(data);
        setStatus("idle");
      } catch (e) {
        setResult({ error: e.message });
        setStatus("error");
      }
    }, debounceMs);
    return () => clearTimeout(timer.current);
  }, [JSON.stringify(ticket), apiKey, model, debounceMs]);

  return { result, status };
}
```

Add the resolver:

```js
// In src/resolvers/index.js – add this:
import { SYSTEM_PROMPT } from "../prompts";

resolver.define("analyzeTicket", async ({ payload }) => {
  const { ticketText, apiKey, model } = payload;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o",
      max_tokens: 600,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: ticketText },
      ],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  const raw = json.choices[0].message.content.replace(/```json|```/g, "").trim();
  return JSON.parse(raw);
});
```

### 6. src/Settings.jsx

Settings view for entering and saving the OpenAI key, choosing model and debounce delay.

```jsx
import React, { useState } from "react";
import { useStorage } from "./useStorage";

export function Settings() {
  const [apiKey, saveApiKey] = useStorage("openai_api_key", "");
  const [model, saveModel] = useStorage("openai_model", "gpt-4o");
  const [debounce, saveDebounce] = useStorage("debounce_ms", 1000);

  const [keyInput, setKeyInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  const handleSave = async () => {
    if (!keyInput.startsWith("sk-")) {
      setErr("Invalid key – must start with sk-");
      return;
    }
    await saveApiKey(keyInput);
    setSaved(true);
    setErr("");
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ maxWidth: 480, padding: "24px 20px", fontFamily: "sans-serif" }}>
      <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 20 }}>Reviewer settings</h2>

      <section style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 6 }}>
          OPENAI API KEY
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder={apiKey ? "sk-••••••••••••" : "sk-..."}
            style={{ flex: 1, fontSize: 13, padding: "7px 10px", borderRadius: 6, border: "1px solid #ccc", fontFamily: "monospace" }}
          />
          <button onClick={handleSave} style={{ background: "#0052CC", color: "#fff", border: "none", borderRadius: 6, padding: "7px 16px", fontWeight: 500, cursor: "pointer" }}>
            Save
          </button>
        </div>
        {saved && <p style={{ fontSize: 12, color: "#3B6D11", marginTop: 4 }}>Key saved.</p>}
        {err && <p style={{ fontSize: 12, color: "#A32D2D", marginTop: 4 }}>{err}</p>}
      </section>

      <section style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 6 }}>
          GPT MODEL
        </label>
        <select value={model} onChange={(e) => saveModel(e.target.value)} style={{ fontSize: 13, padding: "7px 10px", borderRadius: 6, border: "1px solid #ccc", width: "100%" }}>
          <option value="gpt-4o">gpt-4o (recommended)</option>
          <option value="gpt-4o-mini">gpt-4o-mini (faster, cheaper)</option>
          <option value="gpt-4-turbo">gpt-4-turbo</option>
        </select>
      </section>

      <section>
        <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 6 }}>
          ANALYSIS DELAY — {debounce}ms after last keystroke
        </label>
        <input
          type="range" min="500" max="3000" step="500"
          value={debounce}
          onChange={(e) => saveDebounce(Number(e.target.value))}
          style={{ width: "100%" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", marginTop: 2 }}>
          <span>500ms (fast)</span><span>3000ms (slow)</span>
        </div>
      </section>
    </div>
  );
}
```

### 7. src/Panel.jsx

The main side panel. Listens to the `jira:issueCreatePanel` context, reads field values, and passes them to `useAnalysis`.

```jsx
import React, { useState } from "react";
import { useProductContext } from "@forge/react";
import { useStorage } from "./useStorage";
import { useAnalysis } from "./useAnalysis";

const STATUS_COLORS = {
  ok:   { bg: "#EAF3DE", color: "#3B6D11", icon: "✓" },
  warn: { bg: "#FAEEDA", color: "#854F0B", icon: "!" },
  err:  { bg: "#FCEBEB", color: "#A32D2D", icon: "✕" },
};
const SCORE_COLORS = {
  "Poor":       { bg: "#FCEBEB", color: "#A32D2D" },
  "Needs work": { bg: "#FAEEDA", color: "#854F0B" },
  "Good":       { bg: "#EAF3DE", color: "#3B6D11" },
  "Excellent":  { bg: "#EAF3DE", color: "#3B6D11" },
};

export function Panel() {
  const context = useProductContext();
  const fields = context?.extension?.issueCreate?.fields ?? {};

  const [apiKey, , keyLoading] = useStorage("openai_api_key", "");
  const [model] = useStorage("openai_model", "gpt-4o");
  const [debounce] = useStorage("debounce_ms", 1000);

  const ticket = {
    type:        fields.issuetype?.name?.toLowerCase() === "bug" ? "bug" : fields.issuetype?.name?.toLowerCase() === "task" ? "task" : "story",
    title:       fields.summary ?? "",
    story:       fields.description ?? "",
    description: fields.description ?? "",
    acs:         [], // parse from custom field if your project uses one
    priority:    fields.priority?.name ?? "Medium",
    points:      fields.story_points ?? "",
    steps:       "",
    expected:    "",
  };

  const { result, status } = useAnalysis(ticket, apiKey, model, debounce);

  if (keyLoading) return <div style={{ padding: 16, fontSize: 13, color: "#888" }}>Loading...</div>;

  if (!apiKey) {
    return (
      <div style={{ padding: 16, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "#888", marginBottom: 12, lineHeight: 1.5 }}>
          Add your OpenAI API key in the app settings to enable live analysis.
        </p>
        <a href="/jira/settings/apps/ticket-reviewer-settings" style={{ fontSize: 13, color: "#0052CC" }}>
          Open settings
        </a>
      </div>
    );
  }

  const scoreStyle = result?.label ? SCORE_COLORS[result.label] : null;

  return (
    <div style={{ fontFamily: "sans-serif", fontSize: 13 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid #eee" }}>
        <span style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888" }}>AI reviewer</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {status === "analyzing" && <div style={{ width: 10, height: 10, border: "1.5px solid #ccc", borderTopColor: "#0052CC", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
          {scoreStyle && (
            <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: scoreStyle.bg, color: scoreStyle.color }}>
              {result.score}/100
            </span>
          )}
        </div>
      </div>

      {!result && status !== "analyzing" && (
        <div style={{ padding: 16, fontSize: 12, color: "#aaa" }}>Start filling in the ticket to see analysis.</div>
      )}

      {result && !result.error && (
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {result.findings.map((f, i) => {
            const s = STATUS_COLORS[f.status] || STATUS_COLORS.warn;
            return (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 12 }}>{f.field}</div>
                  <div style={{ fontSize: 11, color: "#666", marginTop: 1, lineHeight: 1.4 }}>{f.msg}</div>
                </div>
              </div>
            );
          })}

          {result.suggestion && (
            <>
              <div style={{ height: 1, background: "#eee", margin: "4px 0" }} />
              <div style={{ background: "#f5f5f5", borderRadius: 6, padding: "8px 10px", fontSize: 12, color: "#555", lineHeight: 1.5 }}>
                <span style={{ fontWeight: 500, color: "#333" }}>Suggested AC: </span>
                {result.suggestion}
              </div>
            </>
          )}
        </div>
      )}

      {result?.error && (
        <div style={{ padding: 12, fontSize: 12, color: "#A32D2D" }}>Error: {result.error}</div>
      )}

      <div style={{ padding: "8px 12px", borderTop: "1px solid #eee", fontSize: 11, color: "#aaa" }}>
        {status === "waiting" && "Waiting for input to settle..."}
        {status === "analyzing" && "Analyzing ticket..."}
        {status === "idle" && result && "Analysis up to date"}
        {status === "idle" && !result && "Waiting for input..."}
        {status === "error" && "Analysis failed"}
      </div>
    </div>
  );
}
```

### 8. src/index.jsx

Routes between panel and settings based on Forge context.

```jsx
import React from "react";
import { render } from "@forge/react";
import { useProductContext } from "@forge/react";
import { Panel } from "./Panel";
import { Settings } from "./Settings";

function App() {
  const context = useProductContext();
  const route = context?.moduleKey;
  if (route === "ticket-reviewer-settings") return <Settings />;
  return <Panel />;
}

render(<App />);
```

---

## Deploy

```bash
forge deploy
forge install --site your-site.atlassian.net
```

To iterate locally with hot reload:

```bash
forge tunnel
```

---

## Key decisions and notes

**Why OpenAI and not Claude here?**
Forge's `external.fetch` whitelist requires you to declare domains upfront. OpenAI is used here per the original spec. To switch to Claude, replace `api.openai.com` in `manifest.yml` and update the resolver in `useAnalysis.js` to use the Anthropic messages endpoint with `x-api-key` header instead of `Authorization: Bearer`.

**API key security**
The key is never sent to the browser. It is read from Forge storage inside the backend resolver and used server-side only. `storage.setSecret` encrypts it at rest in Atlassian's infrastructure.

**Field mapping**
The `jira:issueCreatePanel` context exposes `fields` from the create dialog. Field names depend on your Jira project configuration. If your project uses a custom story points field (e.g. `customfield_10016`), map it explicitly in `Panel.jsx`.

**Acceptance criteria**
Jira does not have a native AC field. Options: (a) use the Description field with a structured format, (b) add a custom text field in your project and map it, or (c) parse a checklist plugin field if your team uses one.

---

## Checklist before first deploy

- [ ] `forge login` done
- [ ] `manifest.yml` updated with your app name
- [ ] `storage.setSecret` / `storage.getSecret` used for API key (not plain `storage.set`)
- [ ] `api.openai.com` declared under `permissions.external.fetch.backend`
- [ ] Custom field names verified against your Jira project schema
- [ ] `forge deploy && forge install` run on your target site
