import { cn } from '@/lib/utils';

import type { Plan } from '@/types/plan';

import { getPlans } from '@/services/adminPlan';

// Cache for plans data
let plansCache: Plan[] | null = null;

// Fallback plans for when API is not available
export const FALLBACK_SERVICE_PLANS = {
  'Premium Care': {
    label: 'Premium Care',
    value: 'premium',
    color: 'bg-foreground text-background',
  },
  'Standard Care': {
    label: 'Standard Care',
    value: 'standard',
    color: 'bg-muted text-foreground',
  },
  'Basic Care': {
    label: 'Basic Care',
    value: 'basic',
    color: 'bg-card text-card-foreground border border-border',
  },
} as const;

export type ServicePlanKey = keyof typeof FALLBACK_SERVICE_PLANS;
export type ServicePlanValue = (typeof FALLBACK_SERVICE_PLANS)[ServicePlanKey];

// Type for dynamic plans from API
export interface DynamicServicePlan {
  label: string;
  value: string;
  color: string;
}

/**
 * Fetch plans from API with caching
 */
export async function fetchServicePlans(): Promise<Plan[]> {
  if (plansCache) {
    return plansCache;
  }

  try {
    const response = await getPlans();
    plansCache = Array.isArray(response) ? response : [];
    return plansCache;
  } catch (_error) {
    // Return empty array, functions will use fallback
    return [];
  }
}

/**
 * Get service plan configuration by name (sync, uses fallback for compatibility)
 */
export function getServicePlan(planName: string): ServicePlanValue | undefined {
  return FALLBACK_SERVICE_PLANS[planName as ServicePlanKey];
}

/**
 * Get service plan color class (sync, uses fallback for compatibility)
 */
export function getServicePlanColor(planName: string): string {
  const plan = getServicePlan(planName);
  return plan?.color || FALLBACK_SERVICE_PLANS['Basic Care'].color;
}

/**
 * Get service plan display name
 */
export function getServicePlanDisplayName(planName: string): string {
  return planName || 'Basic Care';
}

/**
 * Get service plan badge class names (sync, uses fallback for compatibility)
 */
export function getServicePlanBadgeClass(planName: string, additionalClass?: string): string {
  const colorClass = getServicePlanColor(planName);
  return cn('rounded-full px-3 py-1 text-sm font-semibold', colorClass, additionalClass);
}

/**
 * Get all available service plans (sync, uses fallback for compatibility)
 */
export function getAllServicePlans(): ServicePlanValue[] {
  return Object.values(FALLBACK_SERVICE_PLANS);
}

/**
 * Check if a plan name is valid (sync, uses fallback for compatibility)
 */
export function isValidServicePlan(planName: string): boolean {
  return planName in FALLBACK_SERVICE_PLANS;
}

/**
 * Get service plan configuration by name (async, uses API data)
 */
export async function getServicePlanAsync(
  planName: string
): Promise<DynamicServicePlan | undefined> {
  const plans = await fetchServicePlans();

  if (plans.length === 0) {
    // Use fallback
    return FALLBACK_SERVICE_PLANS[planName as ServicePlanKey];
  }

  const plan = plans.find((p) => p.name === planName);
  if (!plan) return undefined;

  return {
    label: plan.name,
    value: plan.code,
    color: getColorForPlan(plan.name),
  };
}

/**
 * Get service plan color class (async, uses API data)
 */
export async function getServicePlanColorAsync(planName: string): Promise<string> {
  const plan = await getServicePlanAsync(planName);
  return plan?.color || FALLBACK_SERVICE_PLANS['Basic Care'].color;
}

/**
 * Get service plan badge class names (async, uses API data)
 */
export async function getServicePlanBadgeClassAsync(
  planName: string,
  additionalClass?: string
): Promise<string> {
  const colorClass = await getServicePlanColorAsync(planName);
  return cn('rounded-full px-3 py-1 text-sm font-semibold', colorClass, additionalClass);
}

/**
 * Get all available service plans (async, uses API data)
 */
export async function getAllServicePlansAsync(): Promise<DynamicServicePlan[]> {
  const plans = await fetchServicePlans();

  if (plans.length === 0) {
    // Use fallback
    return Object.values(FALLBACK_SERVICE_PLANS);
  }

  return plans.map((plan) => ({
    label: plan.name,
    value: plan.code,
    color: getColorForPlan(plan.name),
  }));
}

/**
 * Check if a plan name is valid (async, uses API data)
 */
export async function isValidServicePlanAsync(planName: string): Promise<boolean> {
  const plans = await fetchServicePlans();

  if (plans.length === 0) {
    // Use fallback
    return planName in FALLBACK_SERVICE_PLANS;
  }

  return plans.some((p) => p.name === planName);
}

/**
 * Clear plans cache (useful for forcing refresh)
 */
export function clearPlansCache(): void {
  plansCache = null;
}

/**
 * Get color for plan based on name (for dynamic plans)
 */
function getColorForPlan(planName: string): string {
  const colorMap: Record<string, string> = {
    'Premium Care': 'bg-foreground text-background',
    'Standard Care': 'bg-muted text-foreground',
    'Basic Care': 'bg-card text-card-foreground border border-border',
  };

  return colorMap[planName] || 'bg-card text-card-foreground border border-border';
}
