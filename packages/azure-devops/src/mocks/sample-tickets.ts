import type { WorkItemData } from "@ticket-pulse/shared";

export const wellWrittenTicket: WorkItemData = {
  key: "101",
  summary: "Add password reset flow via email verification",
  storyPoints: 5,
  priority: "P1",
  itemType: "User Story",
  labels: ["auth", "security"],
  components: ["backend"],
  status: "New",
  fieldValues: {
    "System.Title": "Add password reset flow via email verification",
    "System.Description": "The flow should send a time-limited token via email...",
    "Custom.AcceptanceCriteria": "- Given a registered user, When they click Forgot Password...",
  },
};

export const poorTicket: WorkItemData = {
  key: "205",
  summary: "Fix bug",
  storyPoints: null,
  priority: null,
  itemType: "Bug",
  labels: [],
  components: [],
  status: "New",
  fieldValues: {
    "System.Title": "Fix bug",
    "System.Description": "There's a bug somewhere that needs to be fixed.",
  },
};

export const sampleTickets = {
  "Well-Written (A)": wellWrittenTicket,
  "Poor (D/F)": poorTicket,
} as const;

export type SampleTicketName = keyof typeof sampleTickets;
