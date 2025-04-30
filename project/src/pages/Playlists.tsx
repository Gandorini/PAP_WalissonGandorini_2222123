import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import PlaylistCard from '../components/PlaylistCard';

interface Playlist {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  item_count: number;
}

export default function Playlists() {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({
    title: '',
    description: '',
    is_public: true,
  });

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          id,
          title,
          description,
          is_public,
          created_at,
          updated_at,
          item_count:playlist_items(count)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setPlaylists(data || []);
    } catch (error) {
      console.error('Erro ao carregar playlists:', error);
      setError('Não foi possível carregar suas playlists. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert([{
          title: newPlaylist.title,
          description: newPlaylist.description || null,
          is_public: newPlaylist.is_public,
        }])
        .select()
        .single();

      if (error) throw error;

      setPlaylists(prev => [{ ...data, item_count: 0 }, ...prev]);
      setOpenDialog(false);
      setNewPlaylist({ title: '', description: '', is_public: true });
    } catch (error) {
      console.error('Erro ao criar playlist:', error);
      setError('Não foi possível criar a playlist. Tente novamente mais tarde.');
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta playlist?')) return;

    try {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId);

      if (error) throw error;

      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    } catch (error) {
      console.error('Erro ao excluir playlist:', error);
      setError('Não foi possível excluir a playlist. Tente novamente mais tarde.');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
    },
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={4}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Minhas Playlists
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            Nova Playlist
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        ) : playlists.length === 0 ? (
          <Box
            sx={{
              py: 8,
              textAlign: 'center',
              bgcolor: 'background.paper',
              borderRadius: 2,
              border: '2px dashed',
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Você ainda não tem nenhuma playlist
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              sx={{ mt: 2 }}
            >
              Criar minha primeira playlist
            </Button>
          </Box>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <Grid container spacing={3}>
              {playlists.map((playlist) => (
                <Grid item xs={12} sm={6} md={4} key={playlist.id}>
                  <motion.div variants={itemVariants}>
                    <PlaylistCard
                      id={playlist.id}
                      title={playlist.title}
                      description={playlist.description || undefined}
                      isPublic={playlist.is_public}
                      itemCount={playlist.item_count}
                      onEdit={() => navigate(`/playlists/${playlist.id}/edit`)}
                      onDelete={() => handleDeletePlaylist(playlist.id)}
                      onClick={() => navigate(`/playlists/${playlist.id}`)}
                    />
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        )}
      </Stack>

      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nova Playlist</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Título"
              fullWidth
              value={newPlaylist.title}
              onChange={(e) => setNewPlaylist(prev => ({ ...prev, title: e.target.value }))}
              required
            />
            <TextField
              label="Descrição"
              fullWidth
              multiline
              rows={3}
              value={newPlaylist.description}
              onChange={(e) => setNewPlaylist(prev => ({ ...prev, description: e.target.value }))}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newPlaylist.is_public}
                  onChange={(e) => setNewPlaylist(prev => ({ ...prev, is_public: e.target.checked }))}
                />
              }
              label="Playlist pública"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCreatePlaylist}
            disabled={!newPlaylist.title.trim()}
          >
            Criar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
} 