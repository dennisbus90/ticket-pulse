# Zigge — Azure DevOps Extension

AI-powered work item quality analysis, estimation suggestions, and timeline visualization rendered as a Work Item Form Group.

---

## Prerequisites

- Node.js 22+
- npm
- An [Azure DevOps organization](https://dev.azure.com) (free)
- A [Visual Studio Marketplace publisher](https://marketplace.visualstudio.com/manage/createpublisher)
- `tfx-cli` — install globally with `npm install -g tfx-cli`

For the AI proxy (required for analysis):

- [Azure Functions Core Tools v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-tools?tabs=v4) — `npm install -g azure-functions-core-tools@4`
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) (for cloud deployment)

---

## Local Development

### 1. Install dependencies

From the repository root:

```bash
npm install
```

### 2. Start the dev server

```bash
npm run dev:azure
```

Open http://localhost:5173. The app loads with mock work item data — no Azure DevOps connection or API keys needed.

### 3. Run the AI proxy locally (optional)

To test real AI analysis locally:

```bash
cd packages/azure-function
npm run build
npm run start
```

The proxy runs at http://localhost:7071/api/analyze. Enter this URL in the extension's Settings panel along with an OpenAI or Anthropic API key.

---

## Deployment

Deploying consists of two parts: the **Azure Function proxy** (backend) and the **extension** (frontend).

### Part A: Deploy the Azure Function proxy

The extension runs in a browser iframe and cannot call AI APIs directly. The proxy handles this.

1. Login to Azure:

   ```bash
   az login
   ```

2. Create the infrastructure (one-time):

   ```bash
   az group create --name ticket-pulse-rg --location westeurope

   az storage account create \
     --name ticketpulsestorage \
     --resource-group ticket-pulse-rg \
     --location westeurope \
     --sku Standard_LRS

   az functionapp create \
     --name ticket-pulse-proxy \
     --resource-group ticket-pulse-rg \
     --storage-account ticketpulsestorage \
     --consumption-plan-location westeurope \
     --runtime node \
     --runtime-version 22 \
     --functions-version 4
   ```

3. Build and deploy:

   ```bash
   cd packages/azure-function
   npm run build
   func azure functionapp publish ticket-pulse-proxy
   ```

4. Note the proxy URL (e.g. `https://ticket-pulse-proxy.azurewebsites.net`). Users enter this in the extension settings.

### Part B: Publish the extension

1. Set your publisher ID in `vss-extension.json`:

   ```json
   {
     "publisher": "your-publisher-id"
   }
   ```

2. Add an extension icon at `images/icon.png` (128x128 PNG).

3. Build the frontend:

   ```bash
   npm run build:azure
   ```

4. Package the extension:

   ```bash
   cd packages/azure-devops
   npx tfx-cli extension create --manifest-globs vss-extension.json
   ```

   This creates a `.vsix` file.

5. Publish and share with your organization:

   ```bash
   npx tfx-cli extension publish --manifest-globs vss-extension.json --share-with your-org-name
   ```

   Or upload the `.vsix` manually at [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage).

6. Install the extension: go to your Azure DevOps Organization Settings > Extensions, find "Zigge", and install it.

7. Open any work item — the **Zigge** group appears on the form.

### Updating the extension

Bump the `version` in `vss-extension.json`, then:

```bash
npm run build:azure
cd packages/azure-devops
npx tfx-cli extension publish --manifest-globs vss-extension.json
```

Installed organizations receive the update automatically.

---

## Configuration (end users)

Open the Settings panel (gear icon) inside any work item:

| Setting | Description |
|---------|------------|
| Proxy URL | Your Azure Function proxy URL |
| API Key | OpenAI or Anthropic API key (stored per-user in Azure DevOps Extension Data Service) |
| Analysis Fields | Work item fields for the AI to review |
| Estimation Field | Numeric field used for estimation (e.g. Story Points, Effort) |
