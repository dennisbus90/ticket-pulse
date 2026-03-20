# Running the Extension on a Jira Development Environment

This guide walks through deploying and testing the Ticket Pulse on a real Jira Cloud site using Atlassian Forge.

---

## Prerequisites TICKET PULSE

1. **Node.js 22+** and npm
2. **Atlassian Forge CLI**
   ```bash
   npm install -g @forge/cli
   ```
3. **Atlassian developer site** (free)
   - Go to [go.atlassian.com/cloud-dev](https://go.atlassian.com/cloud-dev)
   - Create a cloud development site (e.g., `your-team-dev.atlassian.net`)
4. **Log in to Forge CLI**
   ```bash
   forge login
   ```
   This opens a browser to authenticate with your Atlassian account.

---

## Step 1: Register the App

```bash
forge register
```

This creates an app registration and outputs an app ID. Update `manifest.yml` with your ID:

```yaml
app:
  id: ari:cloud:ecosystem::app/YOUR-GENERATED-APP-ID
```

---

## Step 2: Install Dependencies and Build

```bash
# Root dependencies (backend resolver)
npm install

# Frontend dependencies + build
cd static/ticket-pulse
npm install
npm run build
cd ../..
```

---

## Step 3: Deploy to Your Dev Site

```bash
# Deploy the app to Forge
forge deploy

# Install on your Jira development site (first time only)
forge install --site your-team-dev.atlassian.net --product jira
```

You'll be prompted to confirm the permission scopes (`read:jira-work`, `storage:app`).

---

## Step 4: Verify the Installation

1. Open your Jira development site in a browser
2. Navigate to any existing issue (or create a new one)
3. In the right sidebar, look for the **Ticket Pulse** panel
4. Click to expand it — you should see the quality score and validation results

---

## Live Development with Forge Tunnel

Forge Tunnel proxies your local backend code to the cloud, so you can iterate without redeploying:

```bash
# Terminal 1: Start Forge tunnel (backend)
forge tunnel
```

The tunnel intercepts calls to your resolver functions and runs them locally. Changes to `src/index.ts` or `src/openai.ts` take effect immediately.

For frontend changes, you need to rebuild and refresh:

```bash
# Terminal 2: Rebuild frontend after changes
cd static/ticket-pulse
npm run build
```

Then refresh the Jira issue page in your browser.

> **Tip:** For faster frontend iteration, use `npm run dev` locally (see SETUP.md) to develop with mock data, then deploy to Jira for integration testing.

---

## Testing the Extension

### Where it appears

The validator renders as an **issue panel** in the right sidebar of every Jira issue. It runs automatically when the panel is opened.

### What to test

| Scenario | How to test |
|----------|------------|
| Well-written ticket | Create an issue with detailed description, GWT acceptance criteria, edge cases |
| Poor ticket | Create an issue with just a title like "Fix bug" and minimal description |
| Empty ticket | Create an issue with only a summary, no description |
| Auto-refresh | Edit an issue while the panel is open — score should update automatically |
| Re-validate | Click the "Re-validate" button after editing the issue |

### AI Analysis (optional)

1. Click the gear icon in the panel header
2. Enter your OpenAI API key and click **Save**
3. Click **Re-validate** — an "AI Analysis" section should appear with AI-generated insights
4. The API key is stored server-side via Forge storage and is never exposed to the browser

---

## Debugging

### View logs

```bash
forge logs --site your-team-dev.atlassian.net
```

This shows console output from your resolver functions (including `console.log` and `console.error`).

### Common issues

| Problem | Cause | Fix |
|---------|-------|-----|
| Panel doesn't appear | App not installed | Run `forge install --site ...` |
| "Failed to fetch issue data" | Missing permissions | Check `manifest.yml` has `read:jira-work` scope |
| Panel shows old version | Frontend not rebuilt | Run `npm run build` in `static/ticket-pulse/`, then `forge deploy` |
| AI analysis not working | API key not saved or OpenAI error | Check `forge logs` for error details; verify `api.openai.com` is in `manifest.yml` external fetch |
| Permission error after manifest change | Scopes changed | Run `forge install --upgrade --site ...` |

### Inspect the tunnel

When running `forge tunnel`, the terminal shows each resolver invocation with timing. Use this to verify:
- `getIssueData` is being called correctly
- `getSettings` / `saveSettings` work for AI key management
- Any errors in the OpenAI call chain

---

## Updating After Code Changes

### Backend changes (`src/`)

If using Forge Tunnel — changes are picked up automatically.

Otherwise:

```bash
forge deploy
```

### Frontend changes (`static/ticket-pulse/src/`)

```bash
cd static/ticket-pulse
npm run build
cd ../..
forge deploy
```

Then refresh the Jira issue page.

### Manifest changes (`manifest.yml`)

```bash
forge deploy

# If you changed permissions/scopes:
forge install --upgrade --site your-team-dev.atlassian.net
```

---

## Environment Management

Forge supports multiple environments for staged rollouts:

```bash
# Deploy to development (default)
forge deploy

# Deploy to staging
forge deploy --environment staging
forge install --site staging-site.atlassian.net --environment staging --product jira

# Deploy to production
forge deploy --environment production
forge install --site prod-site.atlassian.net --environment production --product jira
```

Each environment has its own Forge storage, so API keys configured in development won't carry over to staging or production.

---

## Quick Reference

```bash
# Full deploy cycle
cd static/ticket-pulse && npm run build && cd ../.. && forge deploy

# Start tunnel for live development
forge tunnel

# Check logs
forge logs --site your-team-dev.atlassian.net

# Upgrade after permission changes
forge install --upgrade --site your-team-dev.atlassian.net

# List installed sites
forge install list
```
