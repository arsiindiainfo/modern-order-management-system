import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import type { AppApiError } from '../../../lib/apiClient';
import { useAuth } from '../hooks/useAuth';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
    } catch (err) {
      const apiError = err as AppApiError;
      if (apiError.fields?.length) {
        for (const field of apiError.fields) {
          if (field.field === 'email' || field.field === 'password') {
            setError(field.field, { message: field.message });
          }
        }
      } else {
        setFormError(apiError.message ?? 'Something went wrong. Please try again.');
      }
    }
  });

  return (
    <Box
      component="form"
      onSubmit={(event) => void onSubmit(event)}
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Typography variant="h5" component="h1">
        Sign in
      </Typography>
      {formError && <Alert severity="error">{formError}</Alert>}
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={!!errors.email}
        helperText={errors.email?.message}
        {...register('email')}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="current-password"
        error={!!errors.password}
        helperText={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" variant="contained" disabled={isSubmitting || !isValid}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </Box>
  );
}
