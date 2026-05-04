## Zigge for Azure DevOps

AI-powered work item quality analysis, estimation suggestions, and timeline visualization -- right inside your work item form.

### Features

- **Quality Analysis** -- AI reviews your work item fields and scores completeness, clarity, and actionability.
- **Estimation Suggestions** -- Compares the current work item against similar completed items to suggest an estimation value.
- **Timeline Visualization** -- See how long the work item has spent in each status, displayed as a visual timeline.

### Getting Started

1. Install the extension from the marketplace.
2. Open any work item -- the Zigge panel appears as a form group.
3. Open **Settings** (gear icon) to add your OpenAI or Claude API key and configure the proxy URL.
4. Select which fields to analyze and which field to use for estimation.
5. Click **Analyze ticket** to run the analysis.

### Configuration

- **Proxy URL** -- The URL of your Azure Function proxy that forwards requests to the AI provider.
- **API Key** -- Your OpenAI or Anthropic API key, stored securely in the Azure DevOps Extension Data Service.
- **Analysis Fields** -- The work item fields to include in the AI quality review.
- **Estimation Field** -- The numeric field your team uses for estimation (e.g., Story Points, Effort).
