import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const EmailConfirmation = () => {
  const { user, setUser } = useAuthStore();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const checkEmailConfirmed = async () => {
    setChecking(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (data.user && data.user.email_confirmed_at) {
        setUser(data.user);
        navigate('/setup');
      } else {
        setError('Email ainda não confirmado.');
      }
    } catch (err) {
      setError('Erro ao verificar confirmação.');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  return (
    <Box sx={{ mt: 8, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>Confirme seu Email</Typography>
      <Typography>Enviamos um link de confirmação para <b>{user?.email}</b>.</Typography>
      <Typography>Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.</Typography>
      <Button variant="contained" sx={{ mt: 3 }} onClick={checkEmailConfirmed} disabled={checking}>
        {checking ? <CircularProgress size={24} /> : 'Já confirmei meu email'}
      </Button>
      {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
    </Box>
  );
};

export default EmailConfirmation; 