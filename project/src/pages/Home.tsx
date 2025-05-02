import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MusicSheet } from '../types/database';
import {
  Box,
  Container,
  Stack,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Pagination,
  CircularProgress,
  Alert,
  Button,
  Paper,
  Grid,
  useTheme,
  alpha,
  Divider,
} from '@mui/material';
import { Search as SearchIcon, LibraryMusic, MusicNote, EmojiEvents, TrendingUp, CloudUpload } from '@mui/icons-material';
import MusicSheetCard from '../components/MusicSheetCard';
import { motion } from 'framer-motion';

const ITEMS_PER_PAGE = 12;

interface FilterOptions {
  instrument: string;
  genre: string;
  difficulty: string;
  sortBy: string;
}

export default function Home() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterOptions>({
    instrument: '',
    genre: '',
    difficulty: '',
    sortBy: 'recent',
  });
  const [sheets, setSheets] = useState<MusicSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  // Buscar partituras destacadas do Supabase
  useEffect(() => {
    const fetchFeaturedSheets = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('music_sheets')
          .select('*', { count: 'exact' });

        // Aplicar filtros de busca
        if (searchQuery) {
          query = query.or(`title.ilike.%${searchQuery}%,composer.ilike.%${searchQuery}%`);
        }

        // Filtrar por instrumento
        if (filters.instrument) {
          query = query.eq('instrument', filters.instrument);
        }

        // Filtrar por dificuldade
        if (filters.difficulty) {
          query = query.eq('difficulty', filters.difficulty);
        }

        // Ordenação
        switch (filters.sortBy) {
          case 'popular':
            query = query.order('likes', { ascending: false });
            break;
          case 'downloads':
            query = query.order('downloads', { ascending: false });
            break;
          case 'recent':
          default:
            query = query.order('created_at', { ascending: false });
            break;
        }

        // Paginação
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        query = query.range(from, to);

        const { data, error: fetchError, count } = await query;

        if (fetchError) throw fetchError;
        
        setSheets(data || []);
        setTotalCount(count || 0);
      } catch (err) {
        setError('Erro ao carregar partituras. Por favor, tente novamente.');
        console.error('Erro ao buscar partituras:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedSheets();
  }, [searchQuery, filters, page]);

  const handleFilterChange = (field: keyof FilterOptions, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Variantes de animação
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 12
      }
    }
  };

  return (
    <Box>
      {/* Hero Section com Gradiente */}
      <Box 
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          py: { xs: 6, md: 10 },
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Elementos decorativos flutuantes */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0 }}>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [Math.random() * 20, Math.random() * -20],
                x: [Math.random() * 20, Math.random() * -20],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{
                repeat: Infinity,
                duration: 5 + Math.random() * 5,
                repeatType: 'reverse'
              }}
              style={{
                position: 'absolute',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '50%',
                width: 20 + Math.random() * 50,
                height: 20 + Math.random() * 50,
              }}
            />
          ))}
        </Box>

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
              >
                <Typography variant="h2" component="h1" fontWeight="bold" gutterBottom>
                  Descubra e compartilhe partituras musicais
                </Typography>
                <Typography variant="h5" sx={{ mb: 3, opacity: 0.9 }}>
                  Uma comunidade para músicos aprenderem, compartilharem e explorarem novas músicas
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button 
                    variant="contained" 
                    size="large"
                    onClick={() => navigate('/explore')}
                    sx={{ 
                      py: 1.5, 
                      px: 3,
                      backgroundColor: 'white',
                      color: theme.palette.primary.main,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.contrastText, 0.9)
                      }
                    }}
                  >
                    Explorar Partituras
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="large"
                    onClick={() => navigate('/upload')}
                    sx={{ 
                      py: 1.5, 
                      px: 3,
                      borderColor: 'white',
                      color: 'white',
                      '&:hover': {
                        borderColor: alpha(theme.palette.primary.contrastText, 0.9),
                        backgroundColor: alpha(theme.palette.primary.contrastText, 0.1)
                      }
                    }}
                  >
                    Contribuir
                  </Button>
                </Stack>
              </motion.div>
            </Grid>
            <Grid item xs={12} md={5} sx={{ display: { xs: 'none', md: 'block' } }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                <Box 
                  component="img" 
                  src="https://source.unsplash.com/featured/?music,sheet" 
                  alt="Partituras" 
                  sx={{ 
                    width: '100%', 
                    borderRadius: 4,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                  }} 
                />
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* Estatísticas */}
        <Box sx={{ mb: 6 }}>
          <Grid container spacing={3}>
            {[
              { icon: <LibraryMusic fontSize="large" />, label: 'Partituras', value: totalCount },
              { icon: <MusicNote fontSize="large" />, label: 'Instrumentos', value: '10+' },
              { icon: <EmojiEvents fontSize="large" />, label: 'Compositores', value: '50+' },
              { icon: <TrendingUp fontSize="large" />, label: 'Downloads', value: '1000+' },
            ].map((stat, index) => (
              <Grid item xs={6} md={3} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.5 }}
                >
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 3, 
                      textAlign: 'center',
                      borderRadius: 3,
                      bgcolor: theme.palette.mode === 'light' 
                        ? alpha(theme.palette.primary.main, 0.05) 
                        : alpha(theme.palette.primary.main, 0.1),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                    }}
                  >
                    <Box sx={{ color: theme.palette.primary.main, mb: 1 }}>
                      {stat.icon}
                    </Box>
                    <Typography variant="h4" fontWeight="bold" color="primary">
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mb: 4 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Typography variant="h4" gutterBottom>
              Partituras em Destaque
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Explore nossa coleção de partituras compartilhadas pela comunidade
            </Typography>
          </motion.div>
        </Box>

        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 3, 
            bgcolor: theme.palette.mode === 'light' 
              ? alpha(theme.palette.primary.main, 0.02) 
              : alpha(theme.palette.primary.main, 0.05),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar partituras..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ bgcolor: theme.palette.background.paper, borderRadius: 2 }}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={2.5}>
              <FormControl fullWidth sx={{ bgcolor: theme.palette.background.paper, borderRadius: 2 }}>
                <InputLabel>Instrumento</InputLabel>
                <Select
                  value={filters.instrument}
                  label="Instrumento"
                  onChange={(e) =>
                    handleFilterChange('instrument', e.target.value)
                  }
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
                  <MenuItem value="Outro">Outro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={2.5}>
              <FormControl fullWidth sx={{ bgcolor: theme.palette.background.paper, borderRadius: 2 }}>
                <InputLabel>Dificuldade</InputLabel>
                <Select
                  value={filters.difficulty}
                  label="Dificuldade"
                  onChange={(e) =>
                    handleFilterChange('difficulty', e.target.value)
                  }
                >
                  <MenuItem value="">Todas</MenuItem>
                  <MenuItem value="beginner">Iniciante</MenuItem>
                  <MenuItem value="intermediate">Intermediário</MenuItem>
                  <MenuItem value="advanced">Avançado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <FormControl fullWidth sx={{ bgcolor: theme.palette.background.paper, borderRadius: 2 }}>
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
            </Grid>
          </Grid>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : sheets.length === 0 ? (
          <Paper
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 3,
              bgcolor: theme.palette.mode === 'light' 
                ? alpha(theme.palette.primary.main, 0.05) 
                : alpha(theme.palette.primary.main, 0.1),
            }}
          >
            <Typography variant="h5" gutterBottom color="text.secondary">
              Nenhuma partitura encontrada
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Tente outros filtros ou adicione suas próprias partituras
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/upload')}
            >
              Carregar Partitura
            </Button>
          </Paper>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <Grid container spacing={3}>
              {sheets.map((sheet) => (
                <Grid item xs={12} sm={6} md={4} key={sheet.id}>
                  <motion.div variants={itemVariants}>
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
                      isLiked={false}
                      onLike={() => {}}
                      onDownload={() => {}}
                      onPlay={() => {}}
                      onComment={() => {}}
                      onClick={() => navigate(`/sheet/${sheet.id}`)}
                    />
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        )}

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => setPage(p)}
              color="primary"
              size="large"
              variant="outlined"
              shape="rounded"
              sx={{
                '& .MuiPaginationItem-root': {
                  borderRadius: 2, 
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  },
                },
                '& .Mui-selected': {
                  fontWeight: 'bold',
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.2),
                  },
                }
              }}
            />
          </Box>
        )}
      </Container>
    </Box>
  );
}