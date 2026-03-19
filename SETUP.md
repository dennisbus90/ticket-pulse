# Smart Requirements Validator — Setup Guide

## Prerequisites

- **Node.js** 22+ and npm
- **Atlassian Forge CLI**: `npm install -g @forge/cli`
- **Atlassian Cloud developer site**: [Create one free here](https://go.atlassian.com/cloud-dev)
- **Forge CLI logged in**: Run `forge login` and follow the prompts

---

## Initial Setup

### 1. Install dependencies

```bash
# Root dependencies (backend resolver)
npm install

# Frontend dependencies
cd static/smart-validator
npm install
cd ../..
```

### 2. Register the Forge app

```bash
forge register
```

This generates an app ID. Copy it and update `manifest.yml`:

```yaml
app:
  id: ari:cloud:ecosystem::app/YOUR-GENERATED-APP-ID
```

### 3. Build the frontend

```bash
cd static/smart-validator
npm run build
cd ../..
```

### 4. Deploy and install

```bash
# Deploy the app to Forge
forge deploy

# Install on your Jira Cloud site (first time only)
forge install --site your-site.atlassian.net --product jira
```

### 5. Verify

Open any Jira issue. The **Smart Requirements Validator** panel should appear in the issue sidebar, showing a quality score.

---

## Development Workflow

### Local Development (without Forge)

The fastest way to develop and test — no Forge CLI or Jira site needed:

```bash
cd static/smart-validator
npm run dev
```

Open **http://localhost:5173**. The app runs with built-in mock data:

- A **DEV MODE** banner appears at the top with a dropdown to switch between sample tickets:
  - **Well-Written Ticket (A)** — GWT acceptance criteria, edge cases, all fields populated
  - **Poor Ticket (D/F)** — vague description, missing fields, no edge cases
  - **Minimal Ticket (C)** — has summary and description, but missing AC and story points
- Switching tickets instantly re-runs validation with the selected mock data
- The DEV MODE selector and mock data are automatically stripped from production builds

Mock data lives in `src/mocks/sample-tickets.ts` — edit or add tickets there to test specific scenarios.

### Local development with Forge Tunnel

For testing the full integration with a real Jira site, Forge Tunnel proxies your local backend code without redeploying:

```bash
# Terminal 1: Start Forge tunnel (backend)
forge tunnel

# Terminal 2: Start Vite dev server (frontend)
cd static/smart-validator
npm run dev
```

Changes to backend resolver code (`src/`) are picked up automatically via the tunnel. Frontend changes hot-reload via Vite.

### Type-checking

```bash
# Check backend types
npx tsc --noEmit

# Check frontend types
cd static/smart-validator
npx tsc --noEmit
```

### Testing validators in isolation

The validation rules are pure TypeScript functions with no Forge dependency. You can test them directly by passing mock `IssueParsedData` objects:

```typescript
import { runAll } from './src/validators/registry';

const mockIssue = {
  key: 'TEST-1',
  summary: 'Add user authentication',
  descriptionText: 'As a user, I want to log in...',
  acceptanceCriteria: '- Given a valid user, When they submit credentials, Then they are logged in',
  storyPoints: 3,
  priority: 'Medium',
  issueType: 'Story',
  labels: ['auth'],
  components: ['backend'],
  status: 'To Do',
  descriptionRaw: null,
};

const result = runAll(mockIssue);
console.log(result.overallScore, result.grade);
```

### Building for deployment

```bash
cd static/smart-validator
npm run build    # Runs tsc + vite build, outputs to dist/
```

---

## Deployment

### Standard deploy

```bash
# 1. Build the frontend
cd static/smart-validator && npm run build && cd ../..

# 2. Deploy to Forge
forge deploy

# 3. First-time install (skip if already installed)
forge install --site your-site.atlassian.net --product jira
```

After the first install, subsequent `forge deploy` commands automatically update the app — no reinstall needed.

### After manifest permission changes

If you modify permissions in `manifest.yml`, users need to approve the new scopes:

```bash
forge install --upgrade --site your-site.atlassian.net
```

### Environment promotion

Deploy to different environments for staged rollouts:

```bash
# Deploy to staging
forge deploy --environment staging

# Deploy to production
forge deploy --environment production
```

### Viewing logs

```bash
forge logs --site your-site.atlassian.net
```

---

## Project Structure

```
jira-ticket/
├── manifest.yml                          # Forge app config (issue panel module)
├── package.json                          # Root: @forge/resolver, @forge/api
├── tsconfig.json                         # Backend TypeScript config
├── src/
│   ├── index.ts                          # Backend resolver (fetches & normalizes issue data)
│   └── adf-utils.ts                      # Atlassian Document Format → plain text
└── static/smart-validator/               # Frontend (React + TypeScript + Vite)
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts                    # base: './' required for Forge iframe
    ├── index.html
    └── src/
        ├── main.tsx                      # React entry point
        ├── App.tsx                       # Root component (orchestrates data + validation)
        ├── vite-env.d.ts                 # Vite type declarations
        ├── types/                        # TypeScript interfaces
        ├── validators/                   # 5 validation rules + registry
        ├── components/                   # UI: ScoreGauge, RuleSection, ValidationPanel
        ├── hooks/useIssueData.ts         # Fetches issue data via @forge/bridge (or mock in dev)
        ├── mocks/sample-tickets.ts       # Mock ticket data for local development
        └── utils/                        # Text analysis helpers, score calculation
```

---

## Scoring System Reference

The validator scores tickets on a 0–100 scale across 5 rules:

| Rule | Points | What it checks |
|------|--------|----------------|
| Missing Fields | 25 | Summary, description, acceptance criteria, priority, story points, labels |
| Acceptance Criteria Quality | 30 | Testable language, Given/When/Then format, vague words, criterion count |
| Scope Check | 20 | Description length, AC count, multiple concerns, estimate mismatches |
| Edge Case Coverage | 15 | Error handling keywords, boundary conditions, dedicated edge case section |
| Clarity | 10 | Sentence length, passive voice, undefined acronyms, title quality |

### Grades

| Score | Grade | Meaning |
|-------|-------|---------|
| 90–100 | A | Excellent — ready for development |
| 75–89 | B | Good — minor improvements suggested |
| 55–74 | C | Needs Work — several issues to address |
| 35–54 | D | Poor — significant gaps in requirements |
| 0–34 | F | Insufficient — major rework needed |
