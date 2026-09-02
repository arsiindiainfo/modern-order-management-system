import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { AppApiError } from '../../../lib/apiClient';
import { useAuth } from '../hooks/useAuth';
import { Recaptcha } from './Recaptcha';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// A portfolio/demo convenience only — real tenants would never expose
// their own credentials on the login screen itself.
const DEMO_EMAIL = 'manager@acme-demo.com';
const DEMO_PASSWORD = 'DemoPass123!';

const RECAPTCHA_REQUIRED = Boolean(import.meta.env.VITE_RECAPTCHA_SITE_KEY);

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  // A v2 token is single-use — Google's siteverify consumes it on the
  // first check, so a failed login (wrong password, etc.) leaves a dead
  // token behind even though the checkbox still looks checked. Bumping
  // this key remounts <Recaptcha>, which is the only way to force a
  // fresh widget/token short of the imperative grecaptcha.reset() API.
  const [recaptchaKey, setRecaptchaKey] = useState(0);
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });

  const handleRecaptchaVerify = useCallback((token: string | null) => {
    setRecaptchaToken(token);
  }, []);

  const fillDemoCredentials = useCallback(() => {
    setValue('email', DEMO_EMAIL, { shouldValidate: true });
    setValue('password', DEMO_PASSWORD, { shouldValidate: true });
  }, [setValue]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.email, values.password, recaptchaToken ?? undefined);
      void navigate('/', { replace: true });
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
      if (RECAPTCHA_REQUIRED) {
        setRecaptchaToken(null);
        setRecaptchaKey((key) => key + 1);
      }
    }
  });

  const canSubmit = isValid && (!RECAPTCHA_REQUIRED || Boolean(recaptchaToken));

  return (
    <Box
      component="form"
      onSubmit={(event) => void onSubmit(event)}
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5" component="h1">
          Sign in
        </Typography>
        <Tooltip title={`Demo project — click to autofill ${DEMO_EMAIL}`}>
          <Button
            type="button"
            size="small"
            startIcon={<InfoOutlinedIcon fontSize="small" />}
            onClick={fillDemoCredentials}
          >
            Demo login
          </Button>
        </Tooltip>
      </Stack>
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
      <Recaptcha key={recaptchaKey} onVerify={handleRecaptchaVerify} />
      <Button type="submit" variant="contained" disabled={isSubmitting || !canSubmit}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </Box>
  );
}
