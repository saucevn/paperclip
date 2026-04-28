import type { DeploymentExposure, DeploymentMode } from "@paperclipai/shared";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

export function ModeBadge({
  deploymentMode,
  deploymentExposure,
}: {
  deploymentMode?: DeploymentMode;
  deploymentExposure?: DeploymentExposure;
}) {
  const { t } = useTranslation("common");

  if (!deploymentMode) return null;

  const label =
    deploymentMode === "local_trusted"
      ? t("modeBadge.localTrusted")
      : deploymentExposure === "public"
        ? t("modeBadge.authenticatedPublic")
        : t("modeBadge.authenticatedPrivate");

  return <Badge variant="outline">{label}</Badge>;
}
