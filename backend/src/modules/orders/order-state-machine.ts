export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'ON_HOLD'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

interface OrderTransition {
  from: OrderStatus;
  to: OrderStatus;
}

/**
 * The §8 order-status diagram, mirrored from dbo.ufn_LegalOrderTransitions()
 * (database/procedures/ufn_LegalOrderTransitions.sql) — kept in sync by
 * order-state-machine.spec.ts, which asserts this list against a fixture of
 * the SQL function's VALUES rows. The database is still the source of truth
 * (§8): this copy only lets the service layer fail fast before EXECing a
 * stored procedure, and lets the frontend decide which status-change
 * buttons to show. A separate, hand-kept copy also lives in
 * frontend/src/features/orders/orderStateMachine.ts — the frontend and
 * backend are independent apps with no shared package, so this constant is
 * necessarily mirrored rather than imported.
 */
export const ORDER_STATE_MACHINE: readonly OrderTransition[] = [
  { from: 'PENDING', to: 'CONFIRMED' },
  { from: 'CONFIRMED', to: 'PROCESSING' },
  { from: 'PROCESSING', to: 'SHIPPED' },
  { from: 'SHIPPED', to: 'DELIVERED' },
  { from: 'PENDING', to: 'ON_HOLD' },
  { from: 'CONFIRMED', to: 'ON_HOLD' },
  { from: 'PROCESSING', to: 'ON_HOLD' },
  { from: 'ON_HOLD', to: 'PENDING' },
  { from: 'ON_HOLD', to: 'PROCESSING' },
  { from: 'PENDING', to: 'CANCELLED' },
  { from: 'CONFIRMED', to: 'CANCELLED' },
  { from: 'PROCESSING', to: 'CANCELLED' },
  { from: 'ON_HOLD', to: 'CANCELLED' },
];

export function isLegalOrderTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return ORDER_STATE_MACHINE.some((t) => t.from === from && t.to === to);
}
