import { useTranslation } from "react-i18next";
import { PageTabBar } from "@/components/PageTabBar";
import { Tabs } from "@/components/ui/tabs";
import { useLocation, useNavigate } from "@/lib/router";

const NAV_ITEMS = [
  { value: "general" as const, href: "/company/settings" },
  { value: "access" as const, href: "/company/settings/access" },
  { value: "invites" as const, href: "/company/settings/invites" },
];

type CompanySettingsTab = (typeof NAV_ITEMS)[number]["value"];

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
  const { t } = useTranslation("settings");
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getCompanySettingsTab(location.pathname);

  const items = NAV_ITEMS.map((item) => ({
    ...item,
    label: t(`company.tabs.${item.value}`),
  }));

  function handleTabChange(value: string) {
    const nextTab = NAV_ITEMS.find((item) => item.value === value);
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
