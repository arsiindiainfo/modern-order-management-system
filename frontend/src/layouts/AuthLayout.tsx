import { Box, Container, Paper } from '@mui/material';
import { Outlet } from 'react-router-dom';
import logoHorizontal from '../assets/brand/logo-horizontal.png';

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
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Box
            component="img"
            src={logoHorizontal}
            alt="Arsi India Info"
            sx={{ width: '100%', maxWidth: 260 }}
          />
        </Box>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Outlet />
        </Paper>
      </Container>
    </Box>
  );
}
