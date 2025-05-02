import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Divider,
  Alert,
  IconButton,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Link as MuiLink,
} from '@mui/material';
import { Google, Visibility, VisibilityOff, Email } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

interface AuthFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export default function Auth() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, signIn, signInWithGoogle } = useAuthStore();

  const [isSignUp, setIsSignUp] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('signup') === 'true';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AuthFormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  // Estados de erro para cada campo
  const [fieldErrors, setFieldErrors] = useState<{
    email: string | null;
    password: string | null;
    confirmPassword: string | null;
  }>({
    email: null,
    password: null,
    confirmPassword: null,
  });

  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<{ success?: string; error?: string } | null>(null);
  const [isResending, setIsResending] = useState(false);

  // Memoizar handlers para evitar recriações desnecessárias
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    let loadingMessage: HTMLDivElement | null = null;

    try {
      if (isSignUp) {
        await signUp(formData.email, formData.password);
        setIsSignUp(false);
        setFormData(prev => ({...prev, confirmPassword: ''}));
        setError('Cadastro realizado com sucesso! Faça login para continuar.');
      } else {
        // Feedback imediato
        loadingMessage = document.createElement('div');
        loadingMessage.style.position = 'fixed';
        loadingMessage.style.top = '50%';
        loadingMessage.style.left = '50%';
        loadingMessage.style.transform = 'translate(-50%, -50%)';
        loadingMessage.style.background = 'rgba(0, 0, 0, 0.8)';
        loadingMessage.style.color = 'white';
        loadingMessage.style.padding = '20px';
        loadingMessage.style.borderRadius = '8px';
        loadingMessage.style.zIndex = '9999';
        loadingMessage.textContent = 'Entrando...';
        document.body.appendChild(loadingMessage);

        await signIn(formData.email, formData.password);
        navigate('/');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.';
      setError(errorMessage);
      
      if (errorMessage.includes('email não foi verificado') || 
          errorMessage.includes('email ainda não foi verificado')) {
        setShowResendVerification(true);
        setResendEmail(formData.email);
      }
    } finally {
      setLoading(false);
      // Garantir que a mensagem de loading seja sempre removida
      if (loadingMessage && document.body.contains(loadingMessage)) {
        document.body.removeChild(loadingMessage);
      }
    }
  }, [formData, isSignUp, signIn, signUp, navigate]);

  const handleGoogleSignIn = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar com Google.');
    }
  }, [signInWithGoogle]);

  // Função para validar campos individuais
  const validateField = (name: string, value: string) => {
    const newErrors = { ...fieldErrors };
    
    switch (name) {
      case 'email':
        if (!value) {
          newErrors.email = 'Email é obrigatório';
        } else if (!value.includes('@')) {
          newErrors.email = 'Email inválido';
        } else {
          newErrors.email = null;
        }
        break;
        
      case 'password':
        if (!value) {
          newErrors.password = 'Senha é obrigatória';
        } else if (value.length < 6) {
          newErrors.password = 'A senha deve ter pelo menos 6 caracteres';
        } else {
          newErrors.password = null;
        }
        
        // Revalidar confirmação de senha quando a senha é alterada
        if (isSignUp && formData.confirmPassword) {
          if (value !== formData.confirmPassword) {
            newErrors.confirmPassword = 'As senhas não coincidem';
          } else {
            newErrors.confirmPassword = null;
          }
        }
        break;
        
      case 'confirmPassword':
        if (isSignUp) {
          if (!value) {
            newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
          } else if (value !== formData.password) {
            newErrors.confirmPassword = 'As senhas não coincidem';
          } else {
            newErrors.confirmPassword = null;
          }
        }
        break;
    }
    
    setFieldErrors(newErrors);
  };

  const validateForm = () => {
    // Validar todos os campos
    validateField('email', formData.email);
    validateField('password', formData.password);
    if (isSignUp) {
      validateField('confirmPassword', formData.confirmPassword);
    }
    
    // Verificar se há erros
    const hasErrors = 
      fieldErrors.email || 
      fieldErrors.password || 
      (isSignUp && fieldErrors.confirmPassword);
      
    if (hasErrors) {
      setError('Por favor, corrija os erros no formulário.');
      return false;
    }
    
    return true;
  };

  // Limpar erros quando mudar entre login e registro
  useEffect(() => {
    setError(null);
    setFieldErrors({
      email: null,
      password: null,
      confirmPassword: null
    });
  }, [isSignUp]);

  // Função para reenviar email de verificação
  const handleResendVerification = async () => {
    if (!resendEmail) {
      setResendStatus({ error: 'Por favor, informe seu email' });
      return;
    }
    
    setIsResending(true);
    setResendStatus(null);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: resendEmail,
      });
      
      if (error) throw error;
      
      setResendStatus({ 
        success: 'Email de verificação reenviado. Por favor, verifique sua caixa de entrada.' 
      });
    } catch (error) {
      console.error('Erro ao reenviar verificação:', error);
      setResendStatus({ 
        error: 'Erro ao reenviar o email. Por favor tente novamente mais tarde.' 
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          py: 4,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%' }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              borderRadius: 2,
            }}
          >
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={{ mb: 4, fontWeight: 'bold' }}
            >
              {isSignUp ? 'Criar Conta' : 'Entrar'}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <TextField
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  fullWidth
                  required
                  variant="outlined"
                  error={!!fieldErrors.email}
                  helperText={fieldErrors.email}
                />

                <TextField
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  fullWidth
                  required
                  variant="outlined"
                  error={!!fieldErrors.password}
                  helperText={fieldErrors.password}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {isSignUp && (
                  <TextField
                    label="Confirmar Senha"
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    fullWidth
                    required
                    variant="outlined"
                    error={!!fieldErrors.confirmPassword}
                    helperText={fieldErrors.confirmPassword}
                  />
                )}

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    textTransform: 'none',
                    fontSize: '1rem',
                  }}
                >
                  {loading
                    ? 'Processando...'
                    : isSignUp
                    ? 'Criar Conta'
                    : 'Entrar'}
                </Button>

                <Divider>ou</Divider>

                <Button
                  onClick={handleGoogleSignIn}
                  variant="outlined"
                  size="large"
                  fullWidth
                  startIcon={<Google />}
                  sx={{
                    py: 1.5,
                    textTransform: 'none',
                    fontSize: '1rem',
                  }}
                >
                  Continuar com Google
                </Button>

                <Typography
                  align="center"
                  sx={{ mt: 2, cursor: 'pointer' }}
                  onClick={() => setIsSignUp(!isSignUp)}
                >
                  {isSignUp
                    ? 'Já tem uma conta? Entrar'
                    : 'Não tem uma conta? Criar conta'}
                </Typography>
              </Stack>
            </form>
          </Paper>
          
          {/* Componente de reenvio de verificação de email */}
          {showResendVerification && (
            <Paper
              elevation={3}
              sx={{
                p: 4,
                borderRadius: 2,
                mt: 3,
                bgcolor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Email color="info" />
                  <Typography variant="h6">Verificar Email</Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  É necessário verificar seu email antes de fazer login. Verifique sua caixa de entrada 
                  ou solicite um novo email de verificação.
                </Typography>
                
                {resendStatus?.success && (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    {resendStatus.success}
                  </Alert>
                )}
                
                {resendStatus?.error && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {resendStatus.error}
                  </Alert>
                )}
                
                <TextField 
                  label="Seu email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  fullWidth
                  variant="outlined"
                  size="small"
                />
                
                <Button
                  onClick={handleResendVerification}
                  variant="contained"
                  color="info"
                  disabled={isResending}
                  startIcon={<Email />}
                >
                  {isResending ? 'Enviando...' : 'Reenviar Email de Verificação'}
                </Button>
                
                <Typography variant="body2" align="center">
                  <MuiLink 
                    component="button"
                    onClick={() => setShowResendVerification(false)}
                    sx={{ cursor: 'pointer' }}
                  >
                    Voltar para login
                  </MuiLink>
                </Typography>
              </Stack>
            </Paper>
          )}
        </motion.div>
      </Box>
    </Container>
  );
}