# Zigge — Marketplace listing copy

> Working copy of the Atlassian Marketplace listing for the Jira Forge app
> `ari:cloud:ecosystem::app/e9753c04-110a-4bc5-8e85-caafb15f5d7e`.
> The portal at https://marketplace.atlassian.com/manage/vendors is the
> source of truth — paste from this file when updating.

---

## Short summary (≤80 chars)

AI ticket-quality reviews and estimation hints, right inside Jira issues.

---

## Full description

### What it does

Zigge adds an AI-powered panel to every Jira issue. With one click it reviews the ticket against the fields you care about — summary, description, acceptance criteria, anything you map — and reports concrete findings: missing detail, vague language, ambiguous scope. It also surfaces an estimation hint based on a custom field of your choosing and a timeline of status transitions so you can see where tickets get stuck.

### Highlights

- **Quality reviews** — pick the fields that matter, get a per-field score, severity-tagged findings, and inline "use this" suggestions you can apply with one click.
- **Estimation hints** — point Zigge at any numeric/dropdown field and it suggests a value with similar past tickets as evidence.
- **Status timeline** — see how long a ticket spent in every status, with a clean visualization right in the side panel.
- **Bring your own AI key** — works with OpenAI or Anthropic. You pay the provider directly; we never proxy your data.
- **No external storage** — the app runs entirely on Atlassian Forge. Issue content is never persisted by Zigge.

### AI / data handling

Zigge is an AI-augmented app. To produce reviews and estimates, the **values of the issue fields you select for analysis** are sent at request time to the AI provider whose API key the workspace admin has configured:

- If an **OpenAI** key is configured, requests go to `api.openai.com`.
- If an **Anthropic** key is configured, requests go to `api.anthropic.com`.

Important properties:

- Requests are made directly from Atlassian's Forge runtime to the chosen provider. Zigge does **not** proxy, log, or store the issue content.
- The customer holds the relationship with the AI provider via their own API key — usage is billed by the provider, and provider terms govern the data.
- **No data leaves the Atlassian environment until an API key is configured.** Without a key, the panel renders but cannot run analysis.
- The only data Zigge persists (in Forge `storage:app`) is the encrypted reference to your API key and your field-mapping configuration. No ticket content is stored.

See our privacy policy for full detail.

### Permissions used

- `read:jira-work`, `read:issue-details:jira`, `read:project:jira` — to read the fields you choose to analyze.
- `write:jira-work` — to apply "use this" suggestions back to the issue when you click the button.
- `storage:app` — to store your API key reference and field configuration.
- External fetch: `api.openai.com`, `api.anthropic.com` — for the AI request itself.

### Getting started

1. Install the app on your Jira site.
2. Open any issue and find the **Zigge** panel.
3. Click the gear icon → add an OpenAI or Anthropic API key.
4. Configure the fields to analyze on the Quality tab and (optionally) the field to use for Estimation hints.
5. Click **Analyze ticket**.

---

## What's new — Initial release

- Quality analysis with per-field findings and one-click suggestions.
- Estimation hints based on a configurable Jira field.
- Status transition timeline.
- Support for OpenAI and Anthropic API keys.

---

## Resources

- Documentation: <!-- TODO: link to README on GitHub or your docs site -->
- Support: <!-- TODO: support email -->
- Privacy policy: <!-- TODO: hosted privacy policy URL -->

---

## Categories

- Primary: Reports
- Secondary: Workflow, Project management, AI
