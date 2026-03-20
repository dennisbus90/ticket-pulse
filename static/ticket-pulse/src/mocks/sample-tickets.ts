import type { IssueParsedData } from "../types";

export const wellWrittenTicket: IssueParsedData = {
  key: "PROJ-101",
  summary: "Add password reset flow via email verification",
  descriptionText: `As a user who has forgotten their password, I need a way to securely reset it so I can regain access to my account.

The flow should send a time-limited token via email. The user clicks the link, enters a new password, and is redirected to the login page with a success message.

## Acceptance Criteria

- Given a registered user, When they click "Forgot Password" and enter their email, Then a reset link is sent within 30 seconds
- Given a valid reset token, When the user submits a new password that meets complexity requirements, Then the password is updated and the token is invalidated
- Given an expired token (older than 24 hours), When the user clicks the link, Then they see an error message and a prompt to request a new link
- Given an unregistered email, When submitted on the forgot password form, Then the same success message is shown (to prevent email enumeration)

## Edge Cases

- User requests multiple reset links — only the latest token should be valid
- Concurrent password reset and login attempt — the session should handle the race condition gracefully
- Invalid or malformed token in the URL — display a clear error, do not expose stack traces
- Network timeout during email delivery — retry up to 3 times with exponential backoff
- Null or empty password submission — validate on both client and server side`,
  descriptionRaw: null,
  acceptanceCriteria: `- Given a registered user, When they click "Forgot Password" and enter their email, Then a reset link is sent within 30 seconds
- Given a valid reset token, When the user submits a new password that meets complexity requirements, Then the password is updated and the token is invalidated
- Given an expired token (older than 24 hours), When the user clicks the link, Then they see an error message and a prompt to request a new link
- Given an unregistered email, When submitted on the forgot password form, Then the same success message is shown (to prevent email enumeration)`,
  storyPoints: 5,
  priority: "High",
  issueType: "Story",
  labels: ["auth", "security"],
  components: ["backend", "email-service"],
  status: "To Do",
};

export const poorTicket: IssueParsedData = {
  key: "PROJ-205",
  summary: "Fix bug",
  descriptionText: `There's a bug somewhere in the app that needs to be fixed. Users are complaining about it. It should work properly and display things correctly.

Also we need to update the styling and also add some new features and also refactor the old code. Additionally the performance needs to be improved. Furthermore we should add tests.`,
  descriptionRaw: null,
  acceptanceCriteria: `- It works
- Looks good`,
  storyPoints: null,
  priority: null,
  issueType: "Bug",
  labels: [],
  components: [],
  status: "To Do",
};

export const minimalTicket: IssueParsedData = {
  key: "PROJ-150",
  summary: "Update user profile page with new design",
  descriptionText: `The user profile page needs to be updated to match the new design system. The current layout is outdated and doesn't match the rest of the application. The header section, avatar upload, and form fields should all be updated.`,
  descriptionRaw: null,
  acceptanceCriteria: "",
  storyPoints: null,
  priority: "Medium",
  issueType: "Story",
  labels: ["frontend"],
  components: [],
  status: "In Progress",
};

export const sampleTickets = {
  "Well-Written Ticket (A)": wellWrittenTicket,
  "Poor Ticket (D/F)": poorTicket,
  "Minimal Ticket (C)": minimalTicket,
} as const;

export type SampleTicketName = keyof typeof sampleTickets;
