# Ticket Pulse — Getting Started

AI-powered ticket quality analysis, estimation suggestions, and timeline visualization for **Jira** and **Azure DevOps**.

---

## Repository Structure

This is a monorepo with four packages:

```
ticket-pulse/
├── package.json                  # Root workspace config
├── tsconfig.base.json            # Shared TypeScript config
└── packages/
    ├── shared/                   # Platform-agnostic library (types, prompts, scoring)
    ├── jira/                     # Jira Forge extension
    ├── azure-devops/             # Azure DevOps extension
    └── azure-function/           # AI proxy (Azure Functions)
```

| Package | What it does |
|---------|-------------|
| `shared` | Types, AI prompt templates, text similarity scoring, serialization, and duration formatting shared across platforms |
| `jira` | Atlassian Forge app — renders as an issue panel in Jira Cloud |
| `azure-devops` | Azure DevOps extension — renders as a Work Item Form Group |
| `azure-function` | Lightweight HTTP proxy that calls OpenAI/Anthropic APIs on behalf of the Azure DevOps extension |

---

## Prerequisites

- **Node.js 22+** and npm
- **Git**

### For Jira development

- **Atlassian Forge CLI**: `npm install -g @forge/cli`
- **Atlassian Cloud developer site** (free): [go.atlassian.com/cloud-dev](https://go.atlassian.com/cloud-dev)
- **Forge CLI logged in**: `forge login`

### For Azure DevOps development

- **Azure DevOps organization** (free): [dev.azure.com](https://dev.azure.com)
- **Visual Studio Marketplace publisher account**: [marketplace.visualstudio.com/manage/createpublisher](https://marketplace.visualstudio.com/manage/createpublisher)
- **tfx-cli** (Azure DevOps extension packaging): `npm install -g tfx-cli`

### For the AI proxy (Azure Function)

- **Azure subscription** (free tier works): [azure.microsoft.com/free](https://azure.microsoft.com/free)
- **Azure Functions Core Tools**: `npm install -g azure-functions-core-tools@4`
- **Azure CLI**: [Install Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)

---

## Initial Setup

### 1. Install dependencies

```bash
# Install all workspace dependencies from the root
npm install

# Install Jira frontend dependencies (separate package, not in workspace)
cd packages/jira/static/ticket-pulse && npm install && cd ../../../..

# Install Azure DevOps frontend dependencies
cd packages/azure-devops && npm install && cd ../..
```

### 2. Verify everything compiles

```bash
# Type-check all packages
cd packages/shared && npx tsc --noEmit && cd ../..
cd packages/jira && npx tsc --noEmit && cd ../..
cd packages/jira/static/ticket-pulse && npx tsc --noEmit && cd ../../../..
cd packages/azure-devops && npx tsc --noEmit && cd ../..
cd packages/azure-function && npx tsc --noEmit && cd ../..
```

---

## Local Development

Both the Jira and Azure DevOps frontends support a **dev mode** with mock data — no Forge, Azure DevOps, or AI keys needed.

### Jira frontend

```bash
npm run dev:jira
# or: cd packages/jira/static/ticket-pulse && npm run dev
```

Open **http://localhost:5173**. The app loads with sample tickets (well-written, poor, minimal) and simulated analysis results.

### Azure DevOps frontend

```bash
npm run dev:azure
# or: cd packages/azure-devops && npm run dev
```

Open **http://localhost:5173**. Same dev mode experience with Azure DevOps-flavored mock data.

### Azure Function proxy (local)

```bash
cd packages/azure-function
npm run build
npm run start
```

The function runs at **http://localhost:7071/api/analyze**. Test it with:

```bash
curl -X POST http://localhost:7071/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "ticketText": "Type: Bug\nTitle: Fix login button\nDescription: The login button does not work",
    "provider": "openai",
    "model": "gpt-4o",
    "apiKey": "sk-your-key-here"
  }'
```

---

## Jira Deployment

### First-time setup

1. **Register the Forge app** (generates a unique app ID):

   ```bash
   cd packages/jira
   forge register
   ```

2. **Update `manifest.yml`** with the generated app ID:

   ```yaml
   app:
     id: ari:cloud:ecosystem::app/YOUR-GENERATED-APP-ID
   ```

3. **Build and deploy**:

   ```bash
   # Build the frontend
   cd static/ticket-pulse && npm run build && cd ../..

   # Deploy to Forge
   forge deploy

   # Install on your Jira Cloud site (first time only)
   forge install --site your-site.atlassian.net --product jira
   ```

4. **Verify**: Open any Jira issue. The **Ticket Pulse** panel appears in the issue sidebar.

### Live development with Forge Tunnel

```bash
# Terminal 1: Start Forge tunnel (proxies backend calls locally)
cd packages/jira
forge tunnel

# Terminal 2: Rebuild frontend after changes
cd packages/jira/static/ticket-pulse
npm run build
```

Backend changes via `src/index.ts` are picked up automatically by the tunnel. Frontend changes require a rebuild + browser refresh.

### Subsequent deploys

```bash
# Rebuild + deploy (one command)
cd packages/jira
cd static/ticket-pulse && npm run build && cd ../.. && forge deploy
```

If you changed permissions in `manifest.yml`:

```bash
forge install --upgrade --site your-site.atlassian.net
```

### Viewing logs

```bash
forge logs --site your-site.atlassian.net
```

---

## Azure DevOps Deployment

The Azure DevOps extension requires two parts: the **extension** (frontend) and the **Azure Function proxy** (backend for AI calls).

### Part A: Deploy the Azure Function proxy

The proxy is needed because the Azure DevOps extension runs in a browser iframe and cannot call OpenAI/Anthropic APIs directly (CORS restrictions and API key security).

1. **Login to Azure**:

   ```bash
   az login
   ```

2. **Create a Function App** (one-time):

   ```bash
   # Create a resource group
   az group create --name ticket-pulse-rg --location westeurope

   # Create a storage account (required by Azure Functions)
   az storage account create \
     --name ticketpulsestorage \
     --resource-group ticket-pulse-rg \
     --location westeurope \
     --sku Standard_LRS

   # Create the Function App (Node.js 22, consumption plan)
   az functionapp create \
     --name ticket-pulse-proxy \
     --resource-group ticket-pulse-rg \
     --storage-account ticketpulsestorage \
     --consumption-plan-location westeurope \
     --runtime node \
     --runtime-version 22 \
     --functions-version 4
   ```

3. **Build and deploy**:

   ```bash
   cd packages/azure-function
   npm run build
   func azure functionapp publish ticket-pulse-proxy
   ```

4. **Note the proxy URL** — it will be something like:
   ```
   https://ticket-pulse-proxy.azurewebsites.net
   ```
   Users will enter this URL in the extension settings.

### Part B: Build and publish the Azure DevOps extension

1. **Update `vss-extension.json`** with your publisher ID:

   ```json
   {
     "publisher": "your-publisher-id"
   }
   ```

   Your publisher ID is the one you created at [marketplace.visualstudio.com](https://marketplace.visualstudio.com/manage/createpublisher).

2. **Add an extension icon** at `packages/azure-devops/images/icon.png` (128x128 PNG recommended).

3. **Build the frontend**:

   ```bash
   cd packages/azure-devops
   npm run build
   ```

4. **Package the extension** (creates a `.vsix` file):

   ```bash
   npx tfx-cli extension create --manifest-globs vss-extension.json
   ```

5. **Publish to the marketplace**:

   ```bash
   # Login with a Personal Access Token (PAT) that has Marketplace publish scope
   npx tfx-cli login --service-url https://marketplace.visualstudio.com

   # Publish (or update)
   npx tfx-cli extension publish --manifest-globs vss-extension.json
   ```

   Alternatively, upload the `.vsix` file manually at [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage).

6. **Install on your Azure DevOps organization**:
   - Go to your organization settings > Extensions
   - Find "Ticket Pulse" and install it
   - Or share the extension with your organization from the publisher portal and install from there

7. **Verify**: Open any work item. A **Ticket Pulse** group appears in the work item form. Configure the proxy URL and API key in Settings.

### Updating the extension

```bash
cd packages/azure-devops

# Bump version in vss-extension.json, then:
npm run build
npx tfx-cli extension publish --manifest-globs vss-extension.json
```

Installed organizations receive the update automatically.

---

## Configuration (End Users)

Both extensions have a **Settings** panel (gear icon) where users configure:

| Setting | Description |
|---------|------------|
| **AI API Key** | OpenAI or Anthropic Claude API key. Supports multiple keys with model selection. |
| **Fields to Analyze** | Which ticket/work item fields the AI should review (e.g., Description, Acceptance Criteria). |
| **Estimation Field** | The field used for estimation comparison (e.g., Story Points, Effort, T-Shirt Size). |
| **Proxy URL** (Azure DevOps only) | The Azure Function proxy URL for AI calls. |

### API key security

- **Jira**: Keys are stored server-side via Forge encrypted storage (`storage.setSecret`). They never reach the browser.
- **Azure DevOps**: Keys are stored in Azure DevOps Extension Data Service (per-user scoped). They are sent to the Azure Function proxy over HTTPS for AI calls.

---

## Architecture Overview

### Jira

```
Browser (Jira Cloud)
  └─ Forge iframe → React UI
       └─ @forge/bridge.invoke() → Forge Resolver (Node.js serverless)
            ├─ Jira REST API (read/write issues, fields, changelog)
            └─ OpenAI / Anthropic API (via api.fetch)
```

### Azure DevOps

```
Browser (Azure DevOps)
  └─ Extension iframe → React UI
       ├─ Azure DevOps Extension SDK → Work Item API, Fields API, WIQL, Updates
       └─ fetch() → Azure Function proxy → OpenAI / Anthropic API
```

---

## Project Scripts Reference

Run from the repository root:

| Command | Description |
|---------|------------|
| `npm run dev:jira` | Start Jira frontend dev server (localhost:5173) |
| `npm run dev:azure` | Start Azure DevOps frontend dev server (localhost:5173) |
| `npm run build:shared` | Compile the shared package |
| `npm run build:jira:frontend` | Build Jira frontend for deployment |
| `npm run build:azure` | Build Azure DevOps frontend for deployment |
| `npm run build:proxy` | Compile the Azure Function |
| `npm run deploy:jira` | Deploy Jira app via Forge |
| `npm run package:azure` | Package Azure DevOps extension as .vsix |
| `npm run lint` | Type-check all packages |

---

## Troubleshooting

### Jira

| Problem | Fix |
|---------|-----|
| Panel doesn't appear | Run `forge install --site your-site.atlassian.net --product jira` |
| "Failed to fetch issue data" | Check `manifest.yml` has `read:jira-work` scope |
| Panel shows old version | Rebuild frontend (`npm run build` in `packages/jira/static/ticket-pulse/`) then `forge deploy` |
| Permission error after manifest change | Run `forge install --upgrade --site your-site.atlassian.net` |
| AI analysis not working | Check `forge logs` — verify API key is saved and `api.openai.com`/`api.anthropic.com` are in manifest external fetch |

### Azure DevOps

| Problem | Fix |
|---------|-----|
| Extension not showing on work items | Ensure the extension is installed in your organization. Check organization settings > Extensions. |
| "Proxy URL not configured" | Open Settings in the extension and enter your Azure Function URL (e.g., `https://ticket-pulse-proxy.azurewebsites.net`) |
| Analysis fails with CORS error | Verify the Azure Function is deployed and accessible. The function includes CORS headers for all origins. |
| "Missing or invalid apiKey" | Add an API key in the extension Settings panel |
| Fields dropdown is empty | The extension needs `vso.work` scope to read fields. Check `vss-extension.json` scopes. |
| Extension shows old version | Bump the version in `vss-extension.json` and republish |

### Azure Function proxy

| Problem | Fix |
|---------|-----|
| Function returns 500 | Check the function logs: `func azure functionapp logstream ticket-pulse-proxy` |
| Connection refused locally | Run `npm run build && npm run start` in `packages/azure-function/` |
| AI provider returns error | The error message from OpenAI/Anthropic is forwarded in the response — check the `error` field |
