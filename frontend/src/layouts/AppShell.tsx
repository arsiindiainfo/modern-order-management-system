import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../app/useAuth';

// No BrandFooter here — §29 branding is explicitly deferred (see the
// Phase 0/1 plans); this is bare nav + outlet only.
export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <Box>
      <AppBar position="static">
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div">
            Order Management System
          </Typography>
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2">
                {user.fullName} ({user.role})
              </Typography>
              <Button color="inherit" onClick={() => void logout()}>
                Log out
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
