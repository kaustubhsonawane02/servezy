// Shared enums used across models and middlewares

export const ROLES = ['owner', 'manager', 'billing', 'kitchen'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LEVEL: Record<Role, number> = {
  owner: 4,
  manager: 3,
  billing: 2,
  kitchen: 1,
};

export const SUBSCRIPTION_STATUS = ['trialing', 'active', 'expired', 'cancelled'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[number];

export const ORDER_STATUS = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];
