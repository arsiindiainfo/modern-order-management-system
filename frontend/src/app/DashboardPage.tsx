import { Box, Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

// Placeholder proving the auth chain end-to-end and pointing at the three
// core features — real dashboard widgets (order volume, revenue, etc.)
// are a later-phase concern, not part of §27's Phase 3 scope.
export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Welcome back, {user?.fullName}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Signed in as {user?.role.replace('_', ' ').toLowerCase()}.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardActionArea onClick={() => void navigate('/customers')} sx={{ p: 1 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PeopleOutlinedIcon color="primary" fontSize="large" />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Customers
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Browse and manage your customer accounts
                </Typography>
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>

        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardActionArea onClick={() => void navigate('/products')} sx={{ p: 1 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Inventory2OutlinedIcon color="primary" fontSize="large" />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Products
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage your catalog and stock levels
                </Typography>
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>

        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardActionArea onClick={() => void navigate('/orders')} sx={{ p: 1 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ReceiptLongOutlinedIcon color="primary" fontSize="large" />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Orders
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create orders and track their status
                </Typography>
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>
      </Stack>
    </Box>
  );
}
