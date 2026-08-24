import { useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../app/useAuth';
import logoHorizontal from '../assets/brand/logo-horizontal.png';

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: DashboardOutlinedIcon },
  { label: 'Customers', path: '/customers', icon: PeopleOutlinedIcon },
  { label: 'Products', path: '/products', icon: Inventory2OutlinedIcon },
];

// No BrandFooter here — §29 branding is explicitly deferred (see the
// Phase 0/1 plans); this is nav + outlet only.
export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(768));
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawerContent = (
    <>
      <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'center' }}>
        <Box
          sx={{
            bgcolor: '#fff',
            borderRadius: 2,
            p: 1.25,
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <Box component="img" src={logoHorizontal} alt="Arsi India Info" sx={{ width: '100%', maxWidth: 160 }} />
        </Box>
      </Box>
      <List sx={{ px: 1.5 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              selected={isActive}
              onClick={() => setMobileOpen(false)}
              sx={{
                borderRadius: 1.5,
                mb: 0.5,
                color: '#C4CCDA',
                '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff' },
                '&.Mui-selected:hover': { bgcolor: 'primary.main' },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                <item.icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100svh' }}>
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box', bgcolor: '#0B1A33' } }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box', bgcolor: '#0B1A33' },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            {isMobile && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flexGrow: 1 }} />
            {user && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                  {user.fullName.charAt(0)}
                </Avatar>
                {!isMobile && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                      {user.fullName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.role}
                    </Typography>
                  </Box>
                )}
                <Button startIcon={<LogoutIcon />} onClick={() => void logout()} color="inherit">
                  {isMobile ? '' : 'Log out'}
                </Button>
              </Box>
            )}
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ p: { xs: 2, sm: 3 }, flexGrow: 1, bgcolor: 'background.default', minWidth: 0 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
