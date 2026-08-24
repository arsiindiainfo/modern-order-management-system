import { Box, Container, Paper } from '@mui/material';
import { Outlet } from 'react-router-dom';
import logoIcon from '../assets/brand/logo-icon.png';

export function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.100',
        px: 2,
      }}
    >
      <Container maxWidth="xs" disableGutters>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Box component="img" src={logoIcon} alt="Arsi India Info" sx={{ height: 72, width: 72 }} />
        </Box>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Outlet />
        </Paper>
      </Container>
    </Box>
  );
}
