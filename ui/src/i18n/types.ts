import type commonEn from "../../public/locales/en/common.json";
import type navigationEn from "../../public/locales/en/navigation.json";
import type dashboardEn from "../../public/locales/en/dashboard.json";
import type issuesEn from "../../public/locales/en/issues.json";
import type agentsEn from "../../public/locales/en/agents.json";
import type goalsEn from "../../public/locales/en/goals.json";
import type projectsEn from "../../public/locales/en/projects.json";
import type routinesEn from "../../public/locales/en/routines.json";
import type inboxEn from "../../public/locales/en/inbox.json";
import type approvalsEn from "../../public/locales/en/approvals.json";
import type costsEn from "../../public/locales/en/costs.json";
import type activityEn from "../../public/locales/en/activity.json";
import type settingsEn from "../../public/locales/en/settings.json";
import type authEn from "../../public/locales/en/auth.json";
import type errorsEn from "../../public/locales/en/errors.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof commonEn;
      navigation: typeof navigationEn;
      dashboard: typeof dashboardEn;
      issues: typeof issuesEn;
      agents: typeof agentsEn;
      goals: typeof goalsEn;
      projects: typeof projectsEn;
      routines: typeof routinesEn;
      inbox: typeof inboxEn;
      approvals: typeof approvalsEn;
      costs: typeof costsEn;
      activity: typeof activityEn;
      settings: typeof settingsEn;
      auth: typeof authEn;
      errors: typeof errorsEn;
    };
  }
}
