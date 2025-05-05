import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Navigation from './components/Navigation';

// Lazy load components
const Landing = React.lazy(() => import('./pages/Landing'));
const Home = React.lazy(() => import('./pages/Home'));
const Auth = React.lazy(() => import('./pages/Auth'));
const Upload = React.lazy(() => import('./pages/Upload'));
const SheetViewer = React.lazy(() => import('./pages/SheetViewer'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Explore = React.lazy(() => import('./pages/Explore'));
const Library = React.lazy(() => import('./pages/Library'));
const AuthCallback = React.lazy(() => import('./pages/AuthCallback'));
const Playlists = React.lazy(() => import('./pages/Playlists'));
const PlaylistDetails = React.lazy(() => import('./pages/PlaylistDetails'));
const EmailConfirmation = React.lazy(() => import('./pages/EmailConfirmation'));
const InitialSetup = React.lazy(() => import('./pages/InitialSetup'));

const LoadingFallback = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
    }}
  >
    <CircularProgress />
  </Box>
);

// Rotas que requerem autenticação
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  return user ? <Layout>{children}</Layout> : <Navigate to="/auth" replace />;
};

// Rotas públicas que não devem mostrar o Layout
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  return !user ? children : <Navigate to="/app" replace />;
};

// Rota para setup inicial (após confirmação de email)
const SetupRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  // Aqui você pode adicionar lógica para checar se o perfil está incompleto
  // Por exemplo, buscar o profile e checar se username está preenchido
  // Para simplificação, vamos assumir que se o user existe, pode acessar o setup
  return user ? children : <Navigate to="/auth" replace />;
};

// Rota para confirmação de email
const EmailConfirmationRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  // Se não tem user, volta para login
  return user ? children : <Navigate to="/auth" replace />;
};

export default function AppRoutes() {
  const { user } = useAuthStore();

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/email-confirmation" element={<EmailConfirmationRoute><EmailConfirmation /></EmailConfirmationRoute>} />
        <Route path="/setup" element={<SetupRoute><InitialSetup /></SetupRoute>} />

        {/* Rotas Privadas (com Layout) */}
        <Route path="/app" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/upload" element={<PrivateRoute><Upload /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/library" element={<PrivateRoute><Library /></PrivateRoute>} />
        <Route path="/playlists" element={<PrivateRoute><Playlists /></PrivateRoute>} />
        <Route path="/playlists/:id" element={<PrivateRoute><PlaylistDetails /></PrivateRoute>} />
        {/* Rotas Semi-Públicas (com Layout, mas não requerem autenticação) */}
        <Route 
          path="/explore" 
          element={
            user ? (
              <Layout><Explore /></Layout>
            ) : (
              <Box sx={{ display: 'flex' }}>
                <Navigation />
                <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
                  <Explore />
                </Box>
              </Box>
            )
          } 
        />
        <Route 
          path="/sheet/:id" 
          element={
            user ? (
              <Layout><SheetViewer /></Layout>
            ) : (
              <Box sx={{ display: 'flex' }}>
                <Navigation />
                <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
                  <SheetViewer />
                </Box>
              </Box>
            )
          } 
        />

        {/* Redirecionar rotas não encontradas para a página inicial apropriada */}
        <Route path="*" element={<Navigate to={user ? "/app" : "/"} replace />} />
      </Routes>
    </Suspense>
  );
} 