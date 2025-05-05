import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { Music, Upload as UploadIcon } from 'lucide-react';
import type { MusicSheet, User as DbUser } from '../types/database';
import type { User } from '@supabase/supabase-js';
import {
  Container,
  Box,
  Avatar,
  Typography,
  Tab,
  Tabs,
  Grid,
  Paper,
  Button,
  Stack,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
} from '@mui/material';
import {
  Edit as EditIcon,
  MusicNote as MusicNoteIcon,
  Favorite as FavoriteIcon,
  Download as DownloadIcon,
  LocationOn,
  CalendarToday,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import MusicSheetCard from '../components/MusicSheetCard';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

// Interface que estende o User do Supabase
interface UserProfile extends User {
  username?: string;
  avatar_url?: string;
  location?: string;
  joinDate?: string;
  stats?: {
    downloads: number;
    followers: number;
    following: number;
  };
  bio?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const Profile = () => {
  const { user: authUser, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sheets, setSheets] = useState<MusicSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDeleteProfile, setShowDeleteProfile] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editProfile, setEditProfile] = useState({
    username: user?.username || '',
    location: user?.location || '',
    bio: user?.bio || '',
  });
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!authUser) return;

      try {
        // Buscar o perfil completo da tabela 'profiles'
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (error) throw error;

        setUser(profile);

        if (profile.avatar_url) {
          const { data: { publicUrl } } = supabase
            .storage
            .from('avatar')
            .getPublicUrl(profile.avatar_url);
          setAvatarUrl(publicUrl);
        }

        console.log('avatar_url:', profile.avatar_url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    const fetchSheets = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('music_sheets')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });
      if (!error) setSheets(data || []);
      setLoading(false);
    };

    fetchSheets();

    // Realtime: escuta mudanças só do usuário logado
    const channel = supabase
      .channel('profile:music_sheets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_sheets', filter: `user_id=eq.${authUser.id}` }, fetchSheets)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;

    try {
      setUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `profiles/${user.id}/${user.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatar')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: fileName })
        .eq('id', user.id);

      if (updateError) throw updateError;

      const { data: { publicUrl } } = supabase
        .storage
        .from('avatar')
        .getPublicUrl(fileName);
      
      setAvatarUrl(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUploading(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString()
    : '---';

  const handleRequestDelete = (sheetId: string) => {
    setDeleteId(sheetId);
  };

const handleDeleteSheet = async () => {
  if (!deleteId) return;
  const { error } = await supabase
    .from('music_sheets')
    .delete()
    .eq('id', deleteId);
  if (error) {
    setErrorMsg('Erro ao excluir partitura: ' + (error.message || 'Tente novamente.'));
  } else {
    setSheets(prev => prev.filter(sheet => sheet.id !== deleteId));
    setErrorMsg('Partitura excluída com sucesso!');
  }
  setDeleteId(null);
};

const handleDeleteProfile = async () => {
  setShowDeleteProfile(false);
  try {
    const headers: HeadersInit = authUser?.id ? { 'x-user-id': authUser.id } : {};
    const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/profile`, {
      method: 'DELETE',
      headers,
    });
    if (res.ok) {
      await supabase.auth.signOut();
      navigate('/');
    } else {
      setErrorMsg('Erro ao excluir conta. Tente novamente.');
    }
  } catch (err) {
    setErrorMsg('Erro ao excluir conta. Tente novamente.');
  }
};

  if (!user) return null;

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: theme => theme.palette.mode === 'light' ? '#FAFAFA' : '#121212',
        pt: 2,
        pb: 8
      }}
    >
      <Container maxWidth="lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper 
            elevation={0}
            sx={{ 
              position: 'relative',
              borderRadius: 3, 
              overflow: 'hidden',
              mb: 4,
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
              border: theme => `1px solid ${theme.palette.divider}`,
            }}
          >
            {/* Header com gradiente */}
            <Box 
              sx={{ 
                height: 160, 
                background: theme => 
                  `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                position: 'relative',
              }}
            >
              {/* Bolhas decorativas */}
              <Box
                component={motion.div}
                animate={{ 
                  y: [0, -10, 0],
                  opacity: [0.5, 0.7, 0.5],
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 5,
                  ease: "easeInOut" 
                }}
                sx={{
                  position: 'absolute',
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  top: 20,
                  right: 100,
                  filter: 'blur(10px)',
                }}
              />
              <Box
                component={motion.div}
                animate={{ 
                  y: [0, 10, 0],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 4,
                  delay: 1,
                  ease: "easeInOut" 
                }}
                sx={{
                  position: 'absolute',
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  top: 60,
                  right: 250,
                  filter: 'blur(8px)',
                }}
              />
              <Box
                component={motion.div}
                animate={{ 
                  y: [0, -8, 0],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 6,
                  delay: 2,
                  ease: "easeInOut" 
                }}
                sx={{
                  position: 'absolute',
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  top: 100,
                  left: 140,
                  filter: 'blur(6px)',
                }}
              />
            </Box>
            
            {/* Conteúdo do perfil */}
            <Box sx={{ p: 4, pt: 0, position: 'relative' }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={4}
                alignItems={{ xs: 'center', md: 'flex-start' }}
              >
                {/* Avatar do usuário sobreposto ao header */}
                <Box sx={{ mt: -60, textAlign: 'center' }}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Avatar
                      src={avatarUrl}
                      alt={user?.username || ''}
                      sx={{ 
                        width: 140, 
                        height: 140,
                        border: theme => `5px solid ${theme.palette.background.paper}`,
                        boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                        mb: 2
                      }}
                    />
                  </motion.div>
                  
                  <label htmlFor="avatar-upload">
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleAvatarChange}
                      disabled={uploading}
                    />
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={uploading ? <CircularProgress size={16} /> : <EditIcon />}
                      size="small"
                      sx={{ 
                        mt: 2, 
                        textTransform: 'none',
                        borderRadius: '20px',
                        backgroundColor: 'background.paper',
                        mb: 2
                      }}
                      disabled={uploading}
                    >
                      {uploading ? 'Enviando...' : 'Alterar foto'}
                    </Button>
                  </label>
                  {/* Botão de upload de partitura só no mobile */}
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<UploadIcon />}
                    sx={{
                      mt: 2,
                      mb: 2,
                      borderRadius: '20px',
                      px: 3,
                      py: 1,
                      fontWeight: 600,
                      display: { xs: 'block', md: 'none' }
                    }}
                    onClick={() => {
                      window.location.href = '/upload';
                    }}
                  >
                    Enviar Partitura
                  </Button>
                </Box>
                
                {/* Informações do perfil */}
                <Box sx={{ flexGrow: 1, mt: { xs: 1, md: 3 } }}>
                  <Stack 
                    direction={{ xs: 'column', md: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'center', md: 'flex-start' }}
                    spacing={2}
                    mb={3}
                  >
                    <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                      <Typography variant="h4" gutterBottom fontWeight="bold">
                        {user?.username}
                      </Typography>
                      <Stack 
                        direction="row" 
                        spacing={1} 
                        alignItems="center"
                        justifyContent={{ xs: 'center', md: 'flex-start' }}
                        mt={1}
                      >
                        <Chip 
                          icon={<LocationOn fontSize="small" />} 
                          label={user?.location || 'Sem localização'} 
                          size="small" 
                          sx={{ 
                            borderRadius: '20px',
                            bgcolor: 'background.paper'
                          }}
                        />
                        <Chip 
                          icon={<CalendarToday fontSize="small" />} 
                          label={`Desde ${joinDate}`} 
                          size="small" 
                          sx={{ 
                            borderRadius: '20px',
                            bgcolor: 'background.paper'
                          }}
                        />
                      </Stack>
                    </Box>
                    
                    <Stack direction="row" spacing={2.4} sx={{ mt: 10 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<EditIcon />}
                        onClick={() => {
                          setEditProfile({
                            username: user?.username || '',
                            location: user?.location || '',
                            bio: user?.bio || '',
                          });
                          setEditOpen(true);
                        }}
                        sx={{ borderRadius: '20px', textTransform: 'none', px: { xs: 3, md: 2 }, minWidth: 120, maxWidth: 200 }}
                      >
                        Editar Perfil
                      </Button>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => signOut()}
                        sx={{ borderRadius: '20px', textTransform: 'none' }}
                      >
                        Sair
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        sx={{ borderRadius: '20px', textTransform: 'none' }}
                        onClick={() => setShowDeleteProfile(true)}
                      >
                        Excluir Conta
                      </Button>
                    </Stack>
                  </Stack>
                  
                  {/* Estatísticas do usuário */}
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 3, 
                      borderRadius: 2,
                      bgcolor: theme => alpha(theme.palette.primary.main, 0.04),
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-around',
                      gap: 2
                    }}
                  >
                    <Box sx={{ textAlign: 'center', px: 2 }}>
                      <Typography 
                        variant="h4" 
                        fontWeight="bold" 
                        color="primary.main"
                      >
                        {sheets.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Partituras
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box sx={{ textAlign: 'center', px: 2 }}>
                      <Typography 
                        variant="h4" 
                        fontWeight="bold" 
                        color="primary.main"
                      >
                        {user?.stats?.downloads || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Downloads
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box sx={{ textAlign: 'center', px: 2 }}>
                      <Typography 
                        variant="h4" 
                        fontWeight="bold" 
                        color="primary.main"
                      >
                        {user?.stats?.followers || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Seguidores
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box sx={{ textAlign: 'center', px: 2 }}>
                      <Typography 
                        variant="h4" 
                        fontWeight="bold" 
                        color="primary.main"
                      >
                        {user?.stats?.following || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Seguindo
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              </Stack>
            </Box>
          </Paper>

          {/* Abas de conteúdo */}
          <Paper 
            elevation={0} 
            sx={{ 
              borderRadius: 3,
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
              border: theme => `1px solid ${theme.palette.divider}`,
              overflow: 'hidden'
            }}
          >
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: '3px 3px 0 0'
                },
                '& .MuiTab-root': {
                  py: 2,
                  fontWeight: 600,
                  fontSize: '1rem',
                  transition: 'all 0.2s',
                  '&.Mui-selected': {
                    color: 'primary.main'
                  }
                }
              }}
            >
              <Tab
                label="Minhas Partituras"
                icon={<MusicNoteIcon />}
                iconPosition="start"
              />
              <Tab
                label="Favoritos"
                icon={<FavoriteIcon />}
                iconPosition="start"
              />
              <Tab
                label="Downloads"
                icon={<DownloadIcon />}
                iconPosition="start"
              />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Alert severity="error" sx={{ m: 2 }}>
                  {error}
                </Alert>
              ) : sheets.length === 0 ? (
                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    py: 6,
                    px: 3,
                    textAlign: 'center'
                  }}
                >
                  <Music size={60} color="#ccc" />
                  <Typography variant="h6" mt={2} mb={1}>
                    Você ainda não possui partituras
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    Compartilhe sua primeira partitura para que outros músicos possam acessá-la.
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<UploadIcon />}
                    onClick={() => {
                      // Navigate to upload page
                    }}
                    sx={{ 
                      borderRadius: '20px', 
                      px: 3,
                      py: 1,
                      fontWeight: 600
                    }}
                  >
                    Enviar Partitura
                  </Button>
                </Box>
              ) : (
                <Box sx={{ p: { xs: 2, md: 4 } }}>
                  <Grid container spacing={3}>
                    <AnimatePresence>
                      {sheets.map((sheet, index) => (
                        <Grid item xs={12} sm={6} md={4} key={sheet.id}>
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ 
                              duration: 0.4, 
                              delay: index * 0.05,
                              ease: "easeOut" 
                            }}
                          >
                            <MusicSheetCard
                              sheetId={sheet.id}
                              title={sheet.title}
                              composer={sheet.composer}
                              instrument={sheet.instrument}
                              difficulty={
                                sheet.difficulty === 'beginner' ? 1 :
                                sheet.difficulty === 'intermediate' ? 2 : 3
                              }
                              imageUrl=""
                              fileUrl={sheet.file_url}
                              likes={sheet.likes || 0}
                              downloads={sheet.downloads || 0}
                              comments={sheet.comments || 0}
                              isLiked={false}
                              onLike={() => {}}
                              onDownload={() => {}}
                              onPlay={() => {}}
                              onComment={() => {}}
                              onClick={() => {}}
                              isOwner={user?.id === sheet.user_id}
                              onDelete={() => handleRequestDelete(sheet.id)}
                            />
                          </motion.div>
                        </Grid>
                      ))}
                    </AnimatePresence>
                  </Grid>
                </Box>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {/* Conteúdo para favoritos */}
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  py: 6,
                  textAlign: 'center'
                }}
              >
                <FavoriteIcon sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Sem favoritos ainda
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  As partituras que você favoritar aparecerão aqui.
                </Typography>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              {/* Conteúdo para downloads */}
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  py: 6,
                  textAlign: 'center'
                }}
              >
                <DownloadIcon sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Sem downloads ainda
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  As partituras que você baixar aparecerão aqui.
                </Typography>
              </Box>
            </TabPanel>
          </Paper>
        </motion.div>
      </Container>

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Excluir partitura</DialogTitle>
        <DialogContent>
          Tem certeza que deseja excluir esta partitura?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button onClick={handleDeleteSheet} color="error" variant="contained">Excluir</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showDeleteProfile} onClose={() => setShowDeleteProfile(false)}>
        <DialogTitle>Excluir Conta</DialogTitle>
        <DialogContent>
          Tem certeza que deseja excluir sua conta? Esta ação é irreversível.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteProfile(false)}>Cancelar</Button>
          <Button onClick={handleDeleteProfile} color="error" variant="contained">Excluir</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <DialogTitle>Editar Perfil</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome de usuário"
            value={editProfile.username}
            onChange={e => setEditProfile(p => ({ ...p, username: e.target.value }))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Localização"
            value={editProfile.location}
            onChange={e => setEditProfile(p => ({ ...p, location: e.target.value }))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Bio"
            value={editProfile.bio}
            onChange={e => setEditProfile(p => ({ ...p, bio: e.target.value }))}
            fullWidth
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
          <Button onClick={async () => {
            const { error } = await supabase
              .from('profiles')
              .update(editProfile)
              .eq('id', user.id);
            if (!error) {
              setEditOpen(false);
              setEditSuccess(true);
            } else {
              setEditError('Erro ao salvar perfil.');
            }
          }} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!editError}
        autoHideDuration={4000}
        onClose={() => setEditError('')}
        message={editError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />

      <Snackbar
        open={editSuccess}
        autoHideDuration={3000}
        onClose={() => setEditSuccess(false)}
        message="Perfil atualizado com sucesso!"
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />

      {errorMsg && (
        <Alert severity="error" onClose={() => setErrorMsg('')} sx={{ mt: 2 }}>
          {errorMsg}
        </Alert>
      )}
    </Box>
  );
};

export default Profile;