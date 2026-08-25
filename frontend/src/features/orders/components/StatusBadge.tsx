import type { ReactElement } from 'react';
import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import AutorenewOutlinedIcon from '@mui/icons-material/AutorenewOutlined';
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import type { OrderStatus } from '../types';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: ChipProps['color']; icon: ReactElement }> = {
  PENDING: { label: 'Pending', color: 'default', icon: <ScheduleOutlinedIcon fontSize="small" /> },
  CONFIRMED: { label: 'Confirmed', color: 'info', icon: <VerifiedOutlinedIcon fontSize="small" /> },
  PROCESSING: { label: 'Processing', color: 'info', icon: <AutorenewOutlinedIcon fontSize="small" /> },
  ON_HOLD: { label: 'On Hold', color: 'warning', icon: <PauseCircleOutlinedIcon fontSize="small" /> },
  SHIPPED: { label: 'Shipped', color: 'success', icon: <LocalShippingOutlinedIcon fontSize="small" /> },
  DELIVERED: { label: 'Delivered', color: 'success', icon: <CheckCircleOutlinedIcon fontSize="small" /> },
  CANCELLED: { label: 'Cancelled', color: 'default', icon: <CancelOutlinedIcon fontSize="small" /> },
};

/** Icon + text + color, never color alone (§21 accessibility). */
export function StatusBadge({ status }: { status: OrderStatus }) {
  const config = STATUS_CONFIG[status];
  return <Chip size="small" icon={config.icon} label={config.label} color={config.color} />;
}
