import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined';
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import { useParams } from 'react-router-dom';
import { FormField } from '../../../components/ui/FormField';
import { useToast } from '../../../components/ui/useToast';
import { useAuth } from '../../../app/useAuth';
import type { AppApiError } from '../../../lib/apiClient';
import { StatusBadge } from '../components/StatusBadge';
import { StatusTimeline } from '../components/StatusTimeline';
import { canCancel, canHold, canRecordPayment, canResume, canShip } from '../orderStateMachine';
import {
  useCancelOrder,
  useHoldOrder,
  useOrder,
  useOrderHistory,
  useRecordPayment,
  useRecordShipment,
  useResumeOrder,
} from '../hooks/useOrders';

const holdSchema = z.object({ reason: z.string().min(1, 'A reason is required') });
type HoldInput = z.infer<typeof holdSchema>;

const paymentSchema = z.object({
  provider: z.string().min(1, 'A provider is required'),
  amount: z.number().positive('Enter a positive amount'),
  currency: z.string().length(3, 'Use a 3-letter currency code'),
  transactionRef: z.string().min(1, 'A transaction reference is required'),
});
type PaymentInput = z.infer<typeof paymentSchema>;

const shipmentSchema = z.object({
  carrier: z.string().min(1, 'A carrier is required'),
  trackingNumber: z.string().min(1, 'A tracking number is required'),
});
type ShipmentInput = z.infer<typeof shipmentSchema>;

type PendingAction = 'hold' | 'resume' | 'cancel' | 'payment' | 'ship' | null;

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManage = user?.role === 'TENANT_ADMIN' || user?.role === 'MANAGER';

  const { data: order, isLoading } = useOrder(id);
  const { data: history } = useOrderHistory(id);
  const holdMutation = useHoldOrder(id ?? '');
  const resumeMutation = useResumeOrder(id ?? '');
  const cancelMutation = useCancelOrder(id ?? '');
  const paymentMutation = useRecordPayment(id ?? '');
  const shipmentMutation = useRecordShipment(id ?? '');

  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const holdForm = useForm<HoldInput>({ resolver: zodResolver(holdSchema), mode: 'onChange' });
  const paymentForm = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    mode: 'onChange',
    values: order
      ? { provider: 'STRIPE', amount: order.grandTotal, currency: order.currency, transactionRef: '' }
      : undefined,
  });
  const shipmentForm = useForm<ShipmentInput>({
    resolver: zodResolver(shipmentSchema),
    mode: 'onChange',
  });

  // The payment dialog's fields are pre-filled via `values` rather than
  // typed in — react-hook-form's resolver-driven `isValid` only updates in
  // response to a field's change/blur event, so without an explicit
  // trigger() here, a user who never touches a (correctly prefilled) field
  // would find "Record payment" permanently disabled.
  useEffect(() => {
    if (pendingAction === 'payment') {
      void paymentForm.trigger();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAction, order?.grandTotal, order?.currency]);

  if (isLoading || !order) {
    return <Skeleton variant="rounded" height={400} />;
  }

  const closeDialog = () => {
    setPendingAction(null);
    setActionError(null);
    holdForm.reset();
    shipmentForm.reset();
  };

  const submitHold = holdForm.handleSubmit(async (values) => {
    try {
      await holdMutation.mutateAsync({ version: order.version, reason: values.reason });
      showToast(`Order ${order.orderNumber} placed on hold.`, 'success');
      closeDialog();
    } catch (err) {
      setActionError((err as AppApiError).message ?? 'Could not place this order on hold.');
    }
  });

  const submitPayment = paymentForm.handleSubmit(async (values) => {
    try {
      const result = await paymentMutation.mutateAsync(values);
      showToast(
        result.order.status === 'CONFIRMED'
          ? `Payment captured — order ${order.orderNumber} confirmed.`
          : `Payment captured for order ${order.orderNumber}.`,
        'success',
      );
      closeDialog();
    } catch (err) {
      setActionError((err as AppApiError).message ?? 'Could not record this payment.');
    }
  });

  const submitShipment = shipmentForm.handleSubmit(async (values) => {
    try {
      await shipmentMutation.mutateAsync({ version: order.version, ...values });
      showToast(`Order ${order.orderNumber} shipped.`, 'success');
      closeDialog();
    } catch (err) {
      setActionError((err as AppApiError).message ?? 'Could not record this shipment.');
    }
  });

  const runResume = async () => {
    try {
      await resumeMutation.mutateAsync({ version: order.version });
      showToast(`Order ${order.orderNumber} resumed.`, 'success');
      setPendingAction(null);
    } catch (err) {
      showToast((err as AppApiError).message ?? 'Could not resume this order.', 'error');
      setPendingAction(null);
    }
  };

  const runCancel = async () => {
    try {
      await cancelMutation.mutateAsync({ version: order.version });
      showToast(`Order ${order.orderNumber} cancelled.`, 'success');
      setPendingAction(null);
    } catch (err) {
      showToast((err as AppApiError).message ?? 'Could not cancel this order.', 'error');
      setPendingAction(null);
    }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {order.orderNumber}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {order.customerName} · Placed {new Date(order.placedAt).toLocaleDateString()}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <StatusBadge status={order.status} />
          {canManage && canHold(order.status) && (
            <Button
              size="small"
              startIcon={<PauseCircleOutlinedIcon />}
              onClick={() => setPendingAction('hold')}
            >
              Hold
            </Button>
          )}
          {canManage && canResume(order.status) && (
            <Button
              size="small"
              startIcon={<PlayCircleOutlinedIcon />}
              onClick={() => setPendingAction('resume')}
            >
              Resume
            </Button>
          )}
          {canManage && canCancel(order.status) && (
            <Button
              size="small"
              color="error"
              startIcon={<CancelOutlinedIcon />}
              onClick={() => setPendingAction('cancel')}
            >
              Cancel
            </Button>
          )}
          {canManage && canRecordPayment(order.status) && (
            <Button
              size="small"
              startIcon={<PaymentOutlinedIcon />}
              onClick={() => setPendingAction('payment')}
            >
              Record Payment
            </Button>
          )}
          {canManage && canShip(order.status) && (
            <Button
              size="small"
              startIcon={<LocalShippingOutlinedIcon />}
              onClick={() => setPendingAction('ship')}
            >
              Ship
            </Button>
          )}
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Line items
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Unit price</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Line total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.productName}</TableCell>
                      <TableCell align="right">{line.unitPrice.toFixed(2)}</TableCell>
                      <TableCell align="right">{line.quantity}</TableCell>
                      <TableCell align="right">{line.lineTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={0.5} sx={{ alignSelf: 'flex-end', ml: 'auto', width: 220 }}>
                {[
                  ['Subtotal', order.subtotal],
                  ['Discount', -order.discountTotal],
                  ['Tax', order.taxTotal],
                  ['Shipping', order.shippingTotal],
                ].map(([label, value]) => (
                  <Stack key={label as string} direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {label}
                    </Typography>
                    <Typography variant="body2">{(value as number).toFixed(2)}</Typography>
                  </Stack>
                ))}
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Total
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {order.grandTotal.toFixed(2)} {order.currency}
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Status history
              </Typography>
              {history ? <StatusTimeline entries={history} /> : <Skeleton variant="rounded" height={120} />}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={pendingAction === 'hold'} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Place {order.orderNumber} on hold</DialogTitle>
        <Box component="form" onSubmit={(e) => void submitHold(e)} noValidate>
          <DialogContent>
            <Stack spacing={2}>
              {actionError && <Alert severity="error">{actionError}</Alert>}
              <FormField
                name="reason"
                register={holdForm.register}
                errors={holdForm.formState.errors}
                label="Reason"
                fullWidth
                autoFocus
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDialog} disabled={holdMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={holdMutation.isPending || !holdForm.formState.isValid}>
              {holdMutation.isPending ? 'Saving…' : 'Place on hold'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={pendingAction === 'resume'} onClose={() => setPendingAction(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Resume {order.orderNumber}?</DialogTitle>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPendingAction(null)} disabled={resumeMutation.isPending}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void runResume()} disabled={resumeMutation.isPending}>
            {resumeMutation.isPending ? 'Resuming…' : 'Resume'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pendingAction === 'cancel'} onClose={() => setPendingAction(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel {order.orderNumber}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This releases any reserved stock and cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPendingAction(null)} disabled={cancelMutation.isPending}>
            Keep order
          </Button>
          <Button color="error" variant="contained" onClick={() => void runCancel()} disabled={cancelMutation.isPending}>
            {cancelMutation.isPending ? 'Cancelling…' : 'Cancel order'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pendingAction === 'payment'} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Record payment — {order.orderNumber}</DialogTitle>
        <Box component="form" onSubmit={(e) => void submitPayment(e)} noValidate>
          <DialogContent>
            <Stack spacing={2}>
              {actionError && <Alert severity="error">{actionError}</Alert>}
              <FormField
                name="provider"
                register={paymentForm.register}
                errors={paymentForm.formState.errors}
                label="Provider"
                fullWidth
                autoFocus
              />
              <FormField
                name="amount"
                register={paymentForm.register}
                registerOptions={{ valueAsNumber: true }}
                errors={paymentForm.formState.errors}
                label="Amount"
                type="number"
                slotProps={{ htmlInput: { step: '0.01' } }}
                fullWidth
              />
              <FormField
                name="currency"
                register={paymentForm.register}
                errors={paymentForm.formState.errors}
                label="Currency"
                fullWidth
              />
              <FormField
                name="transactionRef"
                register={paymentForm.register}
                errors={paymentForm.formState.errors}
                label="Transaction reference"
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDialog} disabled={paymentMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={paymentMutation.isPending || !paymentForm.formState.isValid}
            >
              {paymentMutation.isPending ? 'Recording…' : 'Record payment'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={pendingAction === 'ship'} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Ship {order.orderNumber}</DialogTitle>
        <Box component="form" onSubmit={(e) => void submitShipment(e)} noValidate>
          <DialogContent>
            <Stack spacing={2}>
              {actionError && <Alert severity="error">{actionError}</Alert>}
              <FormField
                name="carrier"
                register={shipmentForm.register}
                errors={shipmentForm.formState.errors}
                label="Carrier"
                fullWidth
                autoFocus
              />
              <FormField
                name="trackingNumber"
                register={shipmentForm.register}
                errors={shipmentForm.formState.errors}
                label="Tracking number"
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDialog} disabled={shipmentMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={shipmentMutation.isPending || !shipmentForm.formState.isValid}
            >
              {shipmentMutation.isPending ? 'Saving…' : 'Ship order'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
