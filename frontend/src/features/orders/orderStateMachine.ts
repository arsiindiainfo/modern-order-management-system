import type { OrderStatus } from './types';

interface OrderTransition {
  from: OrderStatus;
  to: OrderStatus;
}

/**
 * Mirrors dbo.ufn_LegalOrderTransitions() (backend/src/database/procedures)
 * and its backend TS copy (backend/src/modules/orders/order-state-machine.ts,
 * parity-tested there against the SQL function). This copy exists purely
 * for frontend button visibility (§8/§21, e.g. hiding "Cancel" once an
 * order is SHIPPED) — the backend/database remain the source of truth for
 * legality; a stale copy here only hides/shows a button, it can never let
 * an illegal transition through, since the SP re-checks it regardless.
 */
export const ORDER_STATE_MACHINE: readonly OrderTransition[] = [
  { from: 'PENDING', to: 'CONFIRMED' },
  { from: 'CONFIRMED', to: 'PROCESSING' },
  { from: 'PROCESSING', to: 'SHIPPED' },
  { from: 'CONFIRMED', to: 'SHIPPED' },
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

function isLegalOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATE_MACHINE.some((t) => t.from === from && t.to === to);
}

/** The backend's hold/resume/cancel endpoints each request a fixed @ToStatus (§6.3) — mirrored here so a button only shows when its fixed target is actually legal from the order's current status. */
export function canHold(status: OrderStatus): boolean {
  return isLegalOrderTransition(status, 'ON_HOLD');
}

export function canResume(status: OrderStatus): boolean {
  return isLegalOrderTransition(status, 'PENDING');
}

export function canCancel(status: OrderStatus): boolean {
  return isLegalOrderTransition(status, 'CANCELLED');
}

export function canShip(status: OrderStatus): boolean {
  return isLegalOrderTransition(status, 'SHIPPED');
}

/** Payment is only meaningful before the order has been confirmed as paid. */
export function canRecordPayment(status: OrderStatus): boolean {
  return status === 'PENDING';
}
