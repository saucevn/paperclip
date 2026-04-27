import { PageTabBar } from "@/components/PageTabBar";
import { Tabs } from "@/components/ui/tabs";
import { useLocation, useNavigate } from "@/lib/router";
import { useTranslation } from "react-i18next";

const NAV_ROUTES = [
  { value: "general", href: "/company/settings" },
  { value: "access", href: "/company/settings/access" },
  { value: "invites", href: "/company/settings/invites" },
] as const;

type CompanySettingsTab = (typeof NAV_ROUTES)[number]["value"];

export function getCompanySettingsTab(pathname: string): CompanySettingsTab {
  if (pathname.includes("/company/settings/access")) {
    return "access";
  }

  if (pathname.includes("/company/settings/invites")) {
    return "invites";
  }

  return "general";
}

export function CompanySettingsNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation("settings");
  const activeTab = getCompanySettingsTab(location.pathname);

  const items = NAV_ROUTES.map(({ value, href }) => ({
    value,
    href,
    label: t(`companyTabs.${value}`),
  }));

  function handleTabChange(value: string) {
    const nextTab = items.find((item) => item.value === value);
    if (!nextTab || nextTab.value === activeTab) return;
    navigate(nextTab.href);
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <PageTabBar
        items={items.map(({ value, label }) => ({ value, label }))}
        value={activeTab}
        onValueChange={handleTabChange}
        align="start"
      />
    </Tabs>
  );
}
