import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CircularProgress, Box, Typography } from '@mui/material';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Verificar se há um hash na URL (OAuth)
        const hash = window.location.hash;
        
        if (hash) {
          console.log('Processando callback de autenticação OAuth');
          // O Supabase vai gerenciar automaticamente o callback
          // devido à configuração detectSessionInUrl: true

          // Aguardar o processamento do Supabase
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verificar se a sessão foi criada
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log('Sessão criada com sucesso, redirecionando para app');
            navigate('/Home');
          } else {
            console.log('Nenhuma sessão encontrada, redirecionando para auth');
            navigate('/auth');
          }
        } else {
          // Verificar se é um callback de verificação de email
          console.log('Verificando sessão para callback de email');
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log('Sessão encontrada, redirecionando para app');
            navigate('/app');
          } else {
            console.log('Nenhuma sessão encontrada, redirecionando para auth');
            navigate('/auth');
          }
        }
      } catch (error) {
        console.error('Erro no callback de autenticação:', error);
        navigate('/auth');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
      }}
    >
      <CircularProgress size={60} />
      <Typography variant="h6" sx={{ mt: 3 }}>
        Processando autenticação...
      </Typography>
    </Box>
  );
} 