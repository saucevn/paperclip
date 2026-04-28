import { useTranslation } from "react-i18next";
import { Database, Gauge, ReceiptText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type SurfaceKey = "inferenceLedger" | "financeLedger" | "liveQuotas";

const SURFACE_KEYS: { key: SurfaceKey; icon: typeof Database }[] = [
  { key: "inferenceLedger", icon: Database },
  { key: "financeLedger", icon: ReceiptText },
  { key: "liveQuotas", icon: Gauge },
] as const;

const SURFACE_TONES = [
  "from-sky-500/12 via-sky-500/6 to-transparent",
  "from-amber-500/14 via-amber-500/6 to-transparent",
  "from-emerald-500/14 via-emerald-500/6 to-transparent",
] as const;

export function AccountingModelCard() {
  const { t } = useTranslation("costs");

  return (
    <Card className="relative overflow-hidden border-border/70">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.1),transparent_32%)]" />
      <CardHeader className="relative px-5 pt-5 pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {t("accounting.title")}
        </CardTitle>
        <CardDescription className="max-w-2xl text-sm leading-6">
          {t("accounting.subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="relative grid gap-3 px-5 pb-5 md:grid-cols-3">
        {SURFACE_KEYS.map(({ key, icon: Icon }, index) => (
          <div
            key={key}
            className={`rounded-2xl border border-border/70 bg-gradient-to-br ${SURFACE_TONES[index]} p-4 shadow-sm`}
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/80">
                <Icon className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <div className="text-sm font-semibold">{t(`accounting.${key}.title`)}</div>
                <div className="text-xs text-muted-foreground">{t(`accounting.${key}.description`)}</div>
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div>{t(`accounting.${key}.point1`)}</div>
              <div>{t(`accounting.${key}.point2`)}</div>
              <div>{t(`accounting.${key}.point3`)}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
