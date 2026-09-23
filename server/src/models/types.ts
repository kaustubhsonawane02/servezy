// Shared enums used across models and middlewares

export const ROLES = ['owner', 'manager', 'billing', 'kitchen', 'superadmin'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LEVEL: Record<Role, number> = {
  superadmin: 5,
  owner: 4,
  manager: 3,
  billing: 2,
  kitchen: 1,
};

export const SUBSCRIPTION_STATUS = ['trial', 'active', 'expired', 'suspended'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[number];

export const ORDER_STATUS = ['placed', 'preparing', 'ready', 'served', 'completed'] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

// Legal state-machine transitions for orders
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  placed: ['preparing'],
  preparing: ['ready'],
  ready: ['served'],
  served: ['completed'],
  completed: [],
};
