export class DashboardOverviewDto {
  kpi?: {
    abnormalToday: number;
    resolvedRate: number;
    avgResponse: number;
    openAlerts: number;
  } = undefined;
  weekly?: {
    counts: number[];
    labels: string[];
  } = undefined;
  statusBreakdown?: {
    danger: number;
    warning: number;
    normal: number;
  } = undefined;
  highRiskTime?: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
    highlightLabel: string;
  } = undefined;
}
