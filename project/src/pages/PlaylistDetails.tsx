import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Container,
  Box,
  Typography,
  IconButton,
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
  Paper,
  Chip,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  DragIndicator as DragIndicatorIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import MusicSheetCard from '../components/MusicSheetCard';

interface Playlist {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface PlaylistItem {
  id: string;
  position: number;
  sheet: {
    id: string;
    title: string;
    composer: string;
    instrument: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    file_url: string;
    likes: number;
    downloads: number;
    comments: number;
    isLiked: boolean;
  };
}

export default function PlaylistDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    is_public: true,
  });

  useEffect(() => {
    if (id) {
      fetchPlaylistDetails();
    }
  }, [id]);

  const fetchPlaylistDetails = async () => {
    try {
      // Buscar detalhes da playlist
      const { data: playlistData, error: playlistError } = await supabase
        .from('playlists')
        .select('*')
        .eq('id', id)
        .single();

      if (playlistError) throw playlistError;
      setPlaylist(playlistData);
      setEditForm({
        title: playlistData.title,
        description: playlistData.description || '',
        is_public: playlistData.is_public,
      });

      // Buscar itens da playlist
      const { data: itemsData, error: itemsError } = await supabase
        .from('playlist_items')
        .select(`
          id,
          position,
          sheet:music_sheets (
            id,
            title,
            composer,
            instrument,
            difficulty,
            file_url,
            likes,
            downloads,
            comments
          )
        `)
        .eq('playlist_id', id)
        .order('position');

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error) {
      console.error('Erro ao carregar detalhes da playlist:', error);
      setError('Não foi possível carregar os detalhes da playlist. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlaylist = async () => {
    try {
      const { error } = await supabase
        .from('playlists')
        .update({
          title: editForm.title,
          description: editForm.description || null,
          is_public: editForm.is_public,
        })
        .eq('id', id);

      if (error) throw error;

      setPlaylist(prev => prev ? {
        ...prev,
        title: editForm.title,
        description: editForm.description || null,
        is_public: editForm.is_public,
      } : null);
      setOpenEditDialog(false);
    } catch (error) {
      console.error('Erro ao atualizar playlist:', error);
      setError('Não foi possível atualizar a playlist. Tente novamente mais tarde.');
    }
  };

  const handleDeletePlaylist = async () => {
    if (!window.confirm('Tem certeza que deseja excluir esta playlist?')) return;

    try {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      navigate('/playlists');
    } catch (error) {
      console.error('Erro ao excluir playlist:', error);
      setError('Não foi possível excluir a playlist. Tente novamente mais tarde.');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!window.confirm('Tem certeza que deseja remover esta partitura da playlist?')) return;

    try {
      const { error } = await supabase
        .from('playlist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Erro ao remover item da playlist:', error);
      setError('Não foi possível remover o item da playlist. Tente novamente mais tarde.');
    }
  };

  const handleReorderItems = async (reorderedItems: PlaylistItem[]) => {
    setItems(reorderedItems);

    try {
      // Atualizar posições no banco de dados
      const updates = reorderedItems.map((item, index) => ({
        id: item.id,
        position: index + 1,
      }));

      const { error } = await supabase
        .from('playlist_items')
        .upsert(updates);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao reordenar itens:', error);
      setError('Não foi possível salvar a nova ordem dos itens. Tente novamente mais tarde.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!playlist) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Playlist não encontrada
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={4}>
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h4" component="h1" gutterBottom>
                  {playlist.title}
                </Typography>
                {playlist.description && (
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    {playlist.description}
                  </Typography>
                )}
                <Chip
                  icon={playlist.is_public ? <PublicIcon /> : <LockIcon />}
                  label={playlist.is_public ? 'Pública' : 'Privada'}
                  color={playlist.is_public ? 'success' : 'default'}
                  size="small"
                />
              </Box>
              <Stack direction="row" spacing={1}>
                <Tooltip title="Editar playlist">
                  <IconButton onClick={() => setOpenEditDialog(true)}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Excluir playlist">
                  <IconButton color="error" onClick={handleDeletePlaylist}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>

            <Divider />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                {items.length} {items.length === 1 ? 'partitura' : 'partituras'}
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/explore', { state: { selectMode: true, playlistId: id } })}
              >
                Adicionar Partituras
              </Button>
            </Box>
          </Stack>
        </Paper>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {items.length === 0 ? (
          <Paper
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 2,
              border: '2px dashed',
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Esta playlist está vazia
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => navigate('/explore', { state: { selectMode: true, playlistId: id } })}
              sx={{ mt: 2 }}
            >
              Adicionar partituras
            </Button>
          </Paper>
        ) : (
          <Reorder.Group
            axis="y"
            values={items}
            onReorder={handleReorderItems}
            as={motion.div}
          >
            <Stack spacing={2}>
              {items.map((item) => (
                <Reorder.Item
                  key={item.id}
                  value={item}
                  as={motion.div}
                  whileDrag={{
                    scale: 1.02,
                    boxShadow: '0 5px 20px rgba(0,0,0,0.2)',
                  }}
                >
                  <Paper
                    sx={{
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      cursor: 'grab',
                      '&:active': { cursor: 'grabbing' },
                    }}
                  >
                    <DragIndicatorIcon color="action" />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {item.sheet.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.sheet.composer}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Paper>
                </Reorder.Item>
              ))}
            </Stack>
          </Reorder.Group>
        )}
      </Stack>

      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Editar Playlist</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Título"
              fullWidth
              value={editForm.title}
              onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              required
            />
            <TextField
              label="Descrição"
              fullWidth
              multiline
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editForm.is_public}
                  onChange={(e) => setEditForm(prev => ({ ...prev, is_public: e.target.checked }))}
                />
              }
              label="Playlist pública"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleUpdatePlaylist}
            disabled={!editForm.title.trim()}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
} 