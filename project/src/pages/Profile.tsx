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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sheets, setSheets] = useState<MusicSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!authUser) return;

      try {
        // Inicializando o userProfile com valores mock para demonstração
        const userProfile: UserProfile = {
          ...authUser,
          username: authUser.email?.split('@')[0] || 'Usuário',
          location: 'Portugal',
          joinDate: new Date().toLocaleDateString(),
          stats: {
            downloads: 0,
            followers: 0,
            following: 0
          }
        };
        
        setUser(userProfile);

        const { data, error: sheetsError } = await supabase
          .from('music_sheets')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false });

        if (sheetsError) throw sheetsError;
        setSheets(data);

        if (userProfile.avatar_url) {
          const { data: { publicUrl } } = supabase
            .storage
            .from('avatars')
            .getPublicUrl(userProfile.avatar_url);
          setAvatarUrl(publicUrl);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [authUser]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;

    try {
      setUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: fileName })
        .eq('id', user.id);

      if (updateError) throw updateError;

      const { data: { publicUrl } } = supabase
        .storage
        .from('avatars')
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
                        boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
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
                        backgroundColor: 'background.paper'
                      }}
                      disabled={uploading}
                    >
                      {uploading ? 'Enviando...' : 'Alterar foto'}
                    </Button>
                  </label>
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
                      <Typography color="text.secondary">
                        {user?.email}
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
                          label={`Desde ${user?.joinDate}`} 
                          size="small" 
                          sx={{ 
                            borderRadius: '20px',
                            bgcolor: 'background.paper'
                          }}
                        />
                      </Stack>
                    </Box>
                    
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<EditIcon />}
                        onClick={() => {
                          // Implementar edição de perfil
                        }}
                        sx={{ 
                          borderRadius: '20px',
                          textTransform: 'none',
                          px: 3
                        }}
                      >
                        Editar Perfil
                      </Button>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => signOut()}
                        sx={{ 
                          borderRadius: '20px',
                          textTransform: 'none'
                        }}
                      >
                        Sair
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
    </Box>
  );
};

export default Profile;