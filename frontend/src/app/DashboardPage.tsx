import { Typography } from '@mui/material';
import { useAuth } from './useAuth';

// Placeholder proving the auth chain end-to-end — real feature pages
// (orders/customers/products/...) start in Phase 2.
export function DashboardPage() {
  const { user } = useAuth();
  return (
    <Typography variant="body1">
      Logged in as {user?.fullName} ({user?.role})
    </Typography>
  );
}
