import { notFound } from "next/navigation";
import { AppGate } from "@/components/AppGate";
import type { TabKey } from "@/components/BottomNav";

type RouteTab = Exclude<TabKey, "more">;

const ROUTE_TABS: ReadonlyArray<RouteTab> = [
  "home",
  "watchlist",
  "chart",
  "orders",
  "positions",
  "holdings",
  "funds",
  "profile",
  "options",
  "screener",
  "reports",
  "portfolio",
  "journal",
  "strategy",
  "brokerage",
  "globalMarkets",
  "news",
  "companyProfile",
];

function isRouteTab(tab: string): tab is RouteTab {
  return ROUTE_TABS.includes(tab as RouteTab);
}

export default async function TabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;

  if (!isRouteTab(tab)) {
    notFound();
  }

  return <AppGate initialTab={tab} />;
}
