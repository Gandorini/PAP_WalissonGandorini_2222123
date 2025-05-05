import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { MusicSheet } from '../types/database';
import {
  Container,
  Box,
  Typography,
  Tab,
  Tabs,
  Stack,
  TextField,
  InputAdornment,
  Button,
  Chip,
  Pagination,
  CircularProgress,
  Alert,
  Select,
  InputLabel,
  FormControl,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Folder as FolderIcon,
  Star as StarIcon,
  Download as DownloadIcon,
  Collections as CollectionsIcon,
  MusicNote as MusicNoteIcon,
  Favorite as FavoriteIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import MusicSheetCard from '../components/MusicSheetCard';

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
      id={`library-tabpanel-${index}`}
      aria-labelledby={`library-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface Collection {
  id: number;
  name: string;
  description: string;
  sheets: number;
  isPublic: boolean;
}

export default function Library() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    instrument: '',
    difficulty: '',
    sortBy: 'recent'
  });
  const [collections, setCollections] = useState<Collection[]>([]);
  const [sheets, setSheets] = useState<MusicSheet[]>([]);
  const [likedSheets, setLikedSheets] = useState<MusicSheet[]>([]);
  const [downloadedSheets, setDownloadedSheets] = useState<MusicSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let isMounted = true;
    
    if (!user) {
      navigate('/auth');
      return () => { isMounted = false; };
    }

    const fetchSheets = async () => {
      if (!isMounted) return;
      setLoading(true);
      setError('');
      
      try {
        const { data, error } = await supabase
          .from('music_sheets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!isMounted) return;
        
        if (error) {
          console.error('Erro ao buscar partituras:', error);
          setError('Ocorreu um erro ao carregar suas partituras. Por favor, tente novamente.');
          return;
        }
        
        const sheetsWithDefaults = (data || []).map(sheet => ({
          ...sheet,
          likes: sheet.likes || 0,
          downloads: sheet.downloads || 0,
          comments: sheet.comments || 0,
          isLiked: false
        }));
        
        setSheets(sheetsWithDefaults);

        setCollections([
          {
            id: 1,
            name: 'Minhas Partituras',
            description: 'Todas as partituras que você criou',
            sheets: data?.length || 0,
            isPublic: true,
          },
          {
            id: 2,
            name: 'Favoritos',
            description: 'Partituras que você marcou como favoritas',
            sheets: 0,
            isPublic: false,
          }
        ]);

        setLikedSheets([]);
        setDownloadedSheets([]);
        
      } catch (err) {
        if (!isMounted) return;
        console.error('Erro ao buscar dados da biblioteca:', err);
        setError('Ocorreu um erro ao carregar suas partituras. Por favor, tente novamente.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSheets();

    // Realtime: escuta mudanças na tabela
    const channel = supabase
      .channel('public:music_sheets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_sheets' }, fetchSheets)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      isMounted = false;
    };
  }, [user, navigate]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Filtrar partituras com todos os filtros (busca, instrumento, dificuldade, ordenação)
  const filteredSheets = (sheets: MusicSheet[]) => {
    let result = [...sheets];
    
    // Filtro por texto de busca
    if (searchQuery) {
      result = result.filter(
        (sheet) =>
          sheet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sheet.composer.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filtro por instrumento
    if (filters.instrument) {
      result = result.filter(sheet => sheet.instrument === filters.instrument);
    }
    
    // Filtro por dificuldade
    if (filters.difficulty) {
      result = result.filter(sheet => sheet.difficulty === filters.difficulty);
    }
    
    // Ordenação
    result = result.sort((a, b) => {
      if (filters.sortBy === 'recent') {
        // Mais recentes primeiro (assumindo que created_at é string ISO)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (filters.sortBy === 'popular') {
        // Mais curtidas primeiro
        return (b.likes || 0) - (a.likes || 0);
      } else if (filters.sortBy === 'downloads') {
        // Mais baixadas primeiro
        return (b.downloads || 0) - (a.downloads || 0);
      }
      return 0;
    });
    
    return result;
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const CollectionCard = ({ collection }: { collection: Collection }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Box
        sx={{
          p: 3,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 1,
          cursor: 'pointer',
          '&:hover': { boxShadow: 3 },
        }}
        onClick={() => {
          // Implementar navegação para a coleção
        }}
      >
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FolderIcon color="primary" />
            <Typography variant="h6" noWrap>
              {collection.name}
            </Typography>
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {collection.description}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {collection.sheets} partituras
            </Typography>
            <Chip
              label={collection.isPublic ? 'Público' : 'Privado'}
              size="small"
              color={collection.isPublic ? 'primary' : 'default'}
            />
          </Box>
        </Stack>
      </Box>
    </motion.div>
  );

  // Funções para as ações do MusicSheetCard
  const handleLike = async (sheetId: string) => {
    try {
      // Lógica para curtir uma partitura
      console.log('Curtir partitura:', sheetId);
      // Atualizar o estado local para feedback imediato
      setSheets(prev => 
        prev.map(sheet => 
          sheet.id === sheetId 
            ? { ...sheet, isLiked: !sheet.isLiked, likes: sheet.isLiked ? (sheet.likes || 1) - 1 : (sheet.likes || 0) + 1 } 
            : sheet
        )
      );
      // Implementar a chamada ao Supabase aqui
    } catch (error) {
      console.error('Erro ao curtir partitura:', error);
    }
  };

  const handleDownload = async (sheetId: string) => {
    try {
      // Lógica para baixar uma partitura
      console.log('Baixar partitura:', sheetId);
      // Implementar a chamada ao Supabase e lógica de download aqui
    } catch (error) {
      console.error('Erro ao baixar partitura:', error);
    }
  };

  const handlePlay = (sheetId: string) => {
    // Lógica para reproduzir uma partitura
    console.log('Reproduzir partitura:', sheetId);
    // Implementar a lógica para reproduzir a partitura aqui
  };

  const handleComment = (sheetId: string) => {
    // Lógica para comentar em uma partitura
    console.log('Comentar na partitura:', sheetId);
    // Navegar para a página de detalhes com a seção de comentários aberta
    navigate(`/sheet/${sheetId}?showComments=true`);
  };

  const handleSheetClick = (sheetId: string) => {
    // Navegar para a página de detalhes da partitura
    navigate(`/sheet/${sheetId}`);
  };

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
      // Remove do estado local
      setSheets(prev => prev.filter(sheet => sheet.id !== deleteId));
      setLikedSheets(prev => prev.filter(sheet => sheet.id !== deleteId));
      setDownloadedSheets(prev => prev.filter(sheet => sheet.id !== deleteId));
      setErrorMsg('Partitura excluída com sucesso!');
    }
    setDeleteId(null);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            Minha Biblioteca
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/upload')}
          >
            Nova Partitura
          </Button>
        </Box>
      
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="library tabs"
            variant="fullWidth"
          >
            <Tab
              icon={<CollectionsIcon />}
              label="Coleções"
              iconPosition="start"
            />
            <Tab
              icon={<MusicNoteIcon />}
              label="Minhas Partituras"
              iconPosition="start"
            />
            <Tab
              icon={<FavoriteIcon />}
              label="Favoritos"
              iconPosition="start"
            />
            <Tab
              icon={<DownloadIcon />}
              label="Downloads"
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Buscar na biblioteca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filtros
          </Button>
        </Box>

        {showFilters && (
          <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Instrumento</InputLabel>
                <Select
                  value={filters.instrument}
                  label="Instrumento"
                  onChange={(e) => handleFilterChange('instrument', e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="Piano">Piano</MenuItem>
                  <MenuItem value="Violino">Violino</MenuItem>
                  <MenuItem value="Guitarra">Guitarra</MenuItem>
                  <MenuItem value="Flauta">Flauta</MenuItem>
                  <MenuItem value="Saxofone">Saxofone</MenuItem>
                  <MenuItem value="Violoncelo">Violoncelo</MenuItem>
                  <MenuItem value="Trompete">Trompete</MenuItem>
                  <MenuItem value="Bateria">Bateria</MenuItem>
                  <MenuItem value="Clarinete">Clarinete</MenuItem>
                  <MenuItem value="Trombone">Trombone</MenuItem>
                  <MenuItem value="Viola">Viola</MenuItem>
                  <MenuItem value="Contrabaixo">Contrabaixo</MenuItem>
                  <MenuItem value="Acordeão">Acordeão</MenuItem>
                  <MenuItem value="Harpa">Harpa</MenuItem>
                  <MenuItem value="Outro">Outro</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Dificuldade</InputLabel>
                <Select
                  value={filters.difficulty}
                  label="Dificuldade"
                  onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                >
                  <MenuItem value="">Todas</MenuItem>
                  <MenuItem value="beginner">Iniciante</MenuItem>
                  <MenuItem value="intermediate">Intermediário</MenuItem>
                  <MenuItem value="advanced">Avançado</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Ordenar por</InputLabel>
                <Select
                  value={filters.sortBy}
                  label="Ordenar por"
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                >
                  <MenuItem value="recent">Mais recentes</MenuItem>
                  <MenuItem value="popular">Mais populares</MenuItem>
                  <MenuItem value="downloads">Mais baixadas</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Box>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Stack spacing={3}>
            <TabPanel value={tabValue} index={0}>
              <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
                {collections.map((collection) => (
                  <Box sx={{ flex: '1 1 300px' }} key={collection.id}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CollectionCard collection={collection} />
                    </motion.div>
                  </Box>
                ))}
              </Stack>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
                {filteredSheets(sheets).length === 0 ? (
                  <Box sx={{ flex: 1 }}>
                    <Box textAlign="center" py={4}>
                      <Typography variant="h6" color="text.secondary">
                        Você ainda não tem partituras
                      </Typography>
                      <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                        Comece fazendo upload da sua primeira partitura!
                      </Typography>
                      <Box mt={2}>
                        <motion.div whileHover={{ scale: 1.05 }}>
                          <button 
                            onClick={() => navigate('/upload')}
                            style={{
                              background: '#6941C6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '10px 16px',
                              cursor: 'pointer',
                              fontWeight: 'bold'
                            }}
                          >
                            Carregar Partitura
                          </button>
                        </motion.div>
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  filteredSheets(sheets).map((sheet) => (
                    <Box sx={{ flex: '1 1 300px' }} key={sheet.id}>
                      <MusicSheetCard
                        sheetId={sheet.id}
                        title={sheet.title}
                        composer={sheet.composer}
                        instrument={sheet.instrument}
                        difficulty={
                          sheet.difficulty === 'beginner' ? 1 :
                          sheet.difficulty === 'intermediate' ? 2 : 3
                        }
                        imageUrl={`https://source.unsplash.com/featured/?music,${sheet.instrument.toLowerCase()}`}
                        fileUrl={sheet.file_url}
                        likes={sheet.likes || 0}
                        downloads={sheet.downloads || 0}
                        comments={sheet.comments || 0}
                        isLiked={sheet.isLiked || false}
                        onLike={() => handleLike(sheet.id)}
                        onDownload={() => handleDownload(sheet.id)}
                        onPlay={() => handlePlay(sheet.id)}
                        onComment={() => handleComment(sheet.id)}
                        onClick={() => handleSheetClick(sheet.id)}
                        isOwner={user?.id === sheet.user_id}
                        onDelete={() => handleRequestDelete(sheet.id)}
                      />
                    </Box>
                  ))
                )}
              </Stack>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
                {filteredSheets(likedSheets).length === 0 ? (
                  <Box sx={{ flex: 1 }}>
                    <Box textAlign="center" py={4}>
                      <Typography variant="h6" color="text.secondary">
                        Você ainda não tem favoritos
                      </Typography>
                      <Typography color="text.secondary" sx={{ mt: 1 }}>
                        Explore partituras e marque-as como favoritas!
                      </Typography>
                      <Box mt={2}>
                        <motion.div whileHover={{ scale: 1.05 }}>
                          <button 
                            onClick={() => navigate('/explore')}
                            style={{
                              background: '#6941C6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '10px 16px',
                              cursor: 'pointer',
                              fontWeight: 'bold'
                            }}
                          >
                            Explorar Partituras
                          </button>
                        </motion.div>
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  filteredSheets(likedSheets).map((sheet) => (
                    <Box sx={{ flex: '1 1 300px' }} key={sheet.id}>
                      <MusicSheetCard
                        sheetId={sheet.id}
                        title={sheet.title}
                        composer={sheet.composer}
                        instrument={sheet.instrument}
                        difficulty={
                          sheet.difficulty === 'beginner' ? 1 :
                          sheet.difficulty === 'intermediate' ? 2 : 3
                        }
                        imageUrl={`https://source.unsplash.com/featured/?music,${sheet.instrument.toLowerCase()}`}
                        fileUrl={sheet.file_url}
                        likes={sheet.likes || 0}
                        downloads={sheet.downloads || 0}
                        comments={sheet.comments || 0}
                        isLiked={sheet.isLiked || false}
                        onLike={() => handleLike(sheet.id)}
                        onDownload={() => handleDownload(sheet.id)}
                        onPlay={() => handlePlay(sheet.id)}
                        onComment={() => handleComment(sheet.id)}
                        onClick={() => handleSheetClick(sheet.id)}
                        isOwner={user?.id === sheet.user_id}
                        onDelete={() => handleRequestDelete(sheet.id)}
                      />
                    </Box>
                  ))
                )}
              </Stack>
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
                {filteredSheets(downloadedSheets).length === 0 ? (
                  <Box sx={{ flex: 1 }}>
                    <Box textAlign="center" py={4}>
                      <Typography variant="h6" color="text.secondary">
                        Você ainda não baixou nenhuma partitura
                      </Typography>
                      <Typography color="text.secondary" sx={{ mt: 1 }}>
                        Baixe partituras para acessá-las offline!
                      </Typography>
                      <Box mt={2}>
                        <motion.div whileHover={{ scale: 1.05 }}>
                          <button 
                            onClick={() => navigate('/explore')}
                            style={{
                              background: '#6941C6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '10px 16px',
                              cursor: 'pointer',
                              fontWeight: 'bold'
                            }}
                          >
                            Explorar Partituras
                          </button>
                        </motion.div>
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  filteredSheets(downloadedSheets).map((sheet) => (
                    <Box sx={{ flex: '1 1 300px' }} key={sheet.id}>
                      <MusicSheetCard
                        sheetId={sheet.id}
                        title={sheet.title}
                        composer={sheet.composer}
                        instrument={sheet.instrument}
                        difficulty={
                          sheet.difficulty === 'beginner' ? 1 :
                          sheet.difficulty === 'intermediate' ? 2 : 3
                        }
                        imageUrl={`https://source.unsplash.com/featured/?music,${sheet.instrument.toLowerCase()}`}
                        fileUrl={sheet.file_url}
                        likes={sheet.likes || 0}
                        downloads={sheet.downloads || 0}
                        comments={sheet.comments || 0}
                        isLiked={sheet.isLiked || false}
                        onLike={() => handleLike(sheet.id)}
                        onDownload={() => handleDownload(sheet.id)}
                        onPlay={() => handlePlay(sheet.id)}
                        onComment={() => handleComment(sheet.id)}
                        onClick={() => handleSheetClick(sheet.id)}
                        isOwner={user?.id === sheet.user_id}
                        onDelete={() => handleRequestDelete(sheet.id)}
                      />
                    </Box>
                  ))
                )}
              </Stack>
            </TabPanel>
          </Stack>
        )}
      </Stack>
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
      {errorMsg && (
        <Alert severity="error" onClose={() => setErrorMsg('')} sx={{ mt: 2 }}>
          {errorMsg}
        </Alert>
      )}
    </Container>
  );
} 