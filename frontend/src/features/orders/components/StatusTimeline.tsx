import { Box, Stack, Typography } from '@mui/material';
import { StatusBadge } from './StatusBadge';
import type { OrderHistoryEntry } from '../types';

function formatChangedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** A simple vertical timeline — no @mui/lab dependency needed for this. */
export function StatusTimeline({ entries }: { entries: OrderHistoryEntry[] }) {
  return (
    <Stack spacing={0}>
      {entries.map((entry, index) => (
        <Box key={`${entry.toStatus}-${entry.changedAt}`} sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 0.5 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                flexShrink: 0,
              }}
            />
            {index < entries.length - 1 && (
              <Box sx={{ width: 2, flexGrow: 1, minHeight: 32, bgcolor: 'divider', my: 0.5 }} />
            )}
          </Box>
          <Box sx={{ pb: 3 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
              <StatusBadge status={entry.toStatus} />
              <Typography variant="caption" color="text.secondary">
                {formatChangedAt(entry.changedAt)}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {entry.changedBy ?? 'System'}
              {entry.note ? ` — ${entry.note}` : ''}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
