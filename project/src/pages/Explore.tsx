import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Container,
  Grid,
  Box,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Pagination,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Drawer,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Badge,
  Divider,
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Close as CloseIcon,
  MusicNote,
  ClearAll,
  SortRounded,
  LibraryMusic,
  FilterAlt,
  Tune,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import MusicSheetCard from '../components/MusicSheetCard';
import type { MusicSheet } from '../types/database';

const ITEMS_PER_PAGE = 12;

const instruments = [
  'Piano',
  'Violino',
  'Guitarra',
  'Flauta',
  'Violoncelo',
  'Saxofone',
  'Trompete',
  'Bateria',
];

const genres = [
  'Clássico',
  'Jazz',
  'Rock',
  'Pop',
  'Blues',
  'Folk',
  'Contemporâneo',
];

const scales = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#',
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb',
  'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m', 'E#m',
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm', 'Dbm', 'Gbm', 'Cbm'
];

interface FilterOptions {
  instruments: string[];
  genres: string[];
  difficulty: string;
  scales: string[];
  sortBy: string;
}

export default function Explore() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    instruments: [],
    genres: [],
    difficulty: '',
    scales: [],
    sortBy: 'recent',
  });
  const [sheets, setSheets] = useState<MusicSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  // Verifica se há uma query de busca na URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [location.search]);

  // Busca partituras do Supabase
  useEffect(() => {
    const fetchSheets = async () => {
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
        if (filters.instruments.length > 0) {
          query = query.in('instrument', filters.instruments);
        }

        // Filtrar por dificuldade
        if (filters.difficulty) {
          query = query.eq('difficulty', filters.difficulty);
        }

        // Filtrar por escalas
        if (filters.scales.length > 0) {
          query = query.overlaps('scales', filters.scales);
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

    fetchSheets();
  }, [searchQuery, filters, page]);

  const handleFilterChange = (
    field: keyof FilterOptions,
    value: string | string[]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
    setPage(1);
  };

  const toggleFilter = (field: 'instruments' | 'genres', value: string) => {
    const currentFilters = filters[field];
    const newFilters = currentFilters.includes(value)
      ? currentFilters.filter((f) => f !== value)
      : [...currentFilters, value];
    handleFilterChange(field, newFilters);
  };

  const clearFilters = () => {
    setFilters({
      instruments: [],
      genres: [],
      difficulty: '',
      scales: [],
      sortBy: 'recent',
    });
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  
  const hasActiveFilters = 
    filters.instruments.length > 0 || 
    filters.genres.length > 0 || 
    filters.difficulty || 
    filters.scales.length > 0;

  const FilterPanel = () => (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight="600" color="primary.main">
          <FilterAlt fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
          Filtros
        </Typography>
        {hasActiveFilters && (
          <Button 
            startIcon={<ClearAll />} 
            onClick={clearFilters}
            size="small" 
            color="primary"
            variant="outlined"
            sx={{ 
              borderRadius: '20px',
              fontSize: '0.75rem',
              py: 0.5
            }}
          >
            Limpar
          </Button>
        )}
      </Stack>
      
    <Stack spacing={3}>
      <Box>
          <Typography 
            variant="subtitle2" 
            fontWeight="600" 
            gutterBottom 
            sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}
          >
            <MusicNote fontSize="small" sx={{ mr: 0.5 }} />
          Instrumentos
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {instruments.map((instrument) => (
            <Chip
              key={instrument}
              label={instrument}
              onClick={() => toggleFilter('instruments', instrument)}
                color={filters.instruments.includes(instrument) ? 'primary' : 'default'}
                variant={filters.instruments.includes(instrument) ? 'filled' : 'outlined'}
                sx={{ 
                  borderRadius: '16px',
                  transition: 'all 0.2s',
                  fontWeight: filters.instruments.includes(instrument) ? 600 : 400,
                  '&:hover': {
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                    transform: 'translateY(-2px)'
                  }
                }}
            />
          ))}
        </Box>
      </Box>

      <Box>
          <Typography 
            variant="subtitle2" 
            fontWeight="600" 
            gutterBottom 
            sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}
          >
            <LibraryMusic fontSize="small" sx={{ mr: 0.5 }} />
          Gêneros
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {genres.map((genre) => (
            <Chip
              key={genre}
              label={genre}
              onClick={() => toggleFilter('genres', genre)}
              color={filters.genres.includes(genre) ? 'primary' : 'default'}
                variant={filters.genres.includes(genre) ? 'filled' : 'outlined'}
                sx={{ 
                  borderRadius: '16px',
                  transition: 'all 0.2s',
                  fontWeight: filters.genres.includes(genre) ? 600 : 400,
                  '&:hover': {
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                    transform: 'translateY(-2px)'
                  }
                }}
            />
          ))}
        </Box>
      </Box>

        <FormControl fullWidth size="small">
        <InputLabel>Dificuldade</InputLabel>
        <Select
          value={filters.difficulty}
          label="Dificuldade"
          onChange={(e) => handleFilterChange('difficulty', e.target.value)}
            sx={{ 
              borderRadius: '10px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: filters.difficulty ? theme.palette.primary.main : undefined
              }
            }}
        >
          <MenuItem value="">Todas</MenuItem>
          {[1, 2, 3, 4, 5].map((level) => (
            <MenuItem key={level} value={level}>
              {level} {level === 1 ? '(Fácil)' : level === 5 ? '(Difícil)' : ''}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

        <FormControl fullWidth size="small">
        <InputLabel>Escalas</InputLabel>
        <Select
          multiple
          value={filters.scales}
          onChange={(e) => handleFilterChange('scales', e.target.value as string[])}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => (
                  <Chip 
                    key={value} 
                    label={value} 
                    size="small" 
                    sx={{ 
                      borderRadius: '12px',
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                      fontSize: '0.7rem'
                    }}
                  />
              ))}
            </Box>
          )}
            sx={{ 
              borderRadius: '10px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: filters.scales.length > 0 ? theme.palette.primary.main : undefined
              }
            }}
        >
          {scales.map((scale) => (
            <MenuItem key={scale} value={scale}>
              {scale}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

        <Box>
          <Divider sx={{ my: 1 }} />
          <Stack direction="row" alignItems="center" spacing={1} mt={1}>
            <SortRounded fontSize="small" color="action" />
            <Typography variant="subtitle2" fontWeight="600" color="text.secondary">
              Ordenar por:
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} mt={1}>
            {[
              { value: 'recent', label: 'Recentes' },
              { value: 'popular', label: 'Populares' },
              { value: 'downloads', label: 'Downloads' }
            ].map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                color={filters.sortBy === option.value ? 'primary' : 'default'}
                variant={filters.sortBy === option.value ? 'filled' : 'outlined'}
                onClick={() => handleFilterChange('sortBy', option.value)}
                size="small"
                sx={{ 
                  fontWeight: filters.sortBy === option.value ? 600 : 400,
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                  }
                }}
              />
            ))}
          </Stack>
        </Box>
    </Stack>
    </Box>
  );

  // Animation variants
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
        type: "spring",
        stiffness: 100
      }
    }
  };

  const filterVariants = {
    collapsed: { 
      height: 0, 
      opacity: 0,
      transition: { 
        duration: 0.3 
      } 
    },
    expanded: { 
      height: "auto", 
      opacity: 1,
      transition: { 
        duration: 0.3 
      } 
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        background: theme.palette.mode === 'light' ? '#FAFAFA' : '#121212',
        pt: 2,
        pb: 8
      }}
    >
      {/* Header section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
          py: 6,
          mb: 4
        }}
      >
        <Container maxWidth="xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Typography 
              variant="h3" 
              component="h1" 
              fontWeight="bold" 
              align="center" 
              gutterBottom
              sx={{ 
                background: 'linear-gradient(45deg, #3f51b5 30%, #00bcd4 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Explore Partituras
            </Typography>
            <Typography variant="h6" color="text.secondary" align="center" sx={{ maxWidth: 800, mx: 'auto' }}>
              Descubra novas músicas, filtre por instrumento, dificuldade e muito mais
            </Typography>
          </motion.div>
        </Container>
      </Box>
      
      <Container maxWidth="xl">
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            mb: 4,
            borderRadius: 2,
            background: theme.palette.mode === 'light' 
              ? alpha(theme.palette.background.paper, 0.8)
              : alpha(theme.palette.background.paper, 0.6),
            backdropFilter: 'blur(10px)'
          }}
        >
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <TextField
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              label="Buscar por título ou compositor"
              variant="outlined"
              fullWidth
              sx={{ 
                maxWidth: { xs: '100%', sm: '60%' },
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                onClick={() => setDrawerOpen(true)}
                startIcon={<Tune />}
                variant="outlined"
                color="primary"
                sx={{ 
                  borderRadius: 2,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1)
                  }
                }}
              >
                Filtros
              </Button>
              {hasActiveFilters && (
                <Button 
                  onClick={clearFilters} 
                  startIcon={<ClearAll />} 
                  variant="outlined"
                  color="secondary"
                  sx={{ 
                    borderRadius: 2,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.secondary.main, 0.1)
                    }
                  }}
                >
                  Limpar
                </Button>
              )}
            </Box>
          </Box>

          <motion.div
            variants={filterVariants}
            initial="collapsed"
            animate={drawerOpen ? "expanded" : "collapsed"}
          >
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Instrumento</InputLabel>
                  <Select
                    value={filters.instruments.join(',')}
                    onChange={(e) => handleFilterChange('instruments', e.target.value.split(','))}
                    label="Instrumento"
                    sx={{ 
                      borderRadius: 2,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: filters.instruments.length > 0 ? theme.palette.primary.main : undefined
                      }
                    }}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {instruments.map((inst) => (
                      <MenuItem key={inst} value={inst}>{inst}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Dificuldade</InputLabel>
                  <Select
                    value={filters.difficulty}
                    onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                    label="Dificuldade"
                    sx={{ 
                      borderRadius: 2,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: filters.difficulty ? theme.palette.primary.main : undefined
                      }
                    }}
                  >
                    <MenuItem value="">Todas</MenuItem>
                    {[1, 2, 3, 4, 5].map((diff) => (
                      <MenuItem key={diff} value={diff}>{diff}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Gênero</InputLabel>
                  <Select
                    value={filters.genres.join(',')}
                    onChange={(e) => handleFilterChange('genres', e.target.value.split(','))}
                    label="Gênero"
                    sx={{ 
                      borderRadius: 2,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: filters.genres.length > 0 ? theme.palette.primary.main : undefined
                      }
                    }}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {genres.map((genre) => (
                      <MenuItem key={genre} value={genre}>{genre}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Escalas</InputLabel>
                  <Select
                    multiple
                    value={filters.scales}
                    onChange={(e) => handleFilterChange('scales', e.target.value as string[])}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip 
                            key={value} 
                            label={value} 
                            size="small" 
                            sx={{ 
                              borderRadius: '12px',
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              color: theme.palette.primary.main,
                              fontWeight: 600,
                              fontSize: '0.7rem'
                            }}
                          />
                        ))}
                      </Box>
                    )}
                    sx={{ 
                      borderRadius: 2,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: filters.scales.length > 0 ? theme.palette.primary.main : undefined
                      }
                    }}
                  >
                    {scales.map((scale) => (
                      <MenuItem key={scale} value={scale}>
                        {scale}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </motion.div>
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={60} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : sheets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Paper 
              elevation={2} 
              sx={{ 
                p: 4, 
                textAlign: 'center', 
                my: 4,
                borderRadius: 2,
                background: theme.palette.mode === 'light' 
                  ? alpha(theme.palette.background.paper, 0.8)
                  : alpha(theme.palette.background.paper, 0.6),
                backdropFilter: 'blur(10px)'
              }}
            >
              <MusicNote sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h5" gutterBottom>Nenhuma partitura encontrada</Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Tente modificar seus filtros para encontrar mais resultados.
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={clearFilters}
                startIcon={<ClearAll />}
                sx={{ 
                  borderRadius: 2,
                  px: 3,
                  py: 1
                }}
              >
                Limpar Filtros
              </Button>
            </Paper>
          </motion.div>
        ) : (
          <>
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  mb: 2,
                  color: 'text.secondary',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <LibraryMusic fontSize="small" />
                Exibindo {sheets.length} partituras
              </Typography>
              
              <Grid container spacing={3}>
                {sheets.map((sheet, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={sheet.id}>
                    <motion.div variants={itemVariants}>
                      <MusicSheetCard
                        {...sheet}
                        sheetId={sheet.id}
                        difficulty={
                          sheet.difficulty === 'beginner' ? 1 :
                          sheet.difficulty === 'intermediate' ? 2 : 3
                        }
                        imageUrl=""
                        fileUrl={sheet.file_url}
                        likes={0}
                        downloads={0}
                        comments={0}
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
              </Grid>

              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(e, value) => setPage(value)}
                    color="primary"
                    size="large"
                    showFirstButton
                    showLastButton
                    sx={{
                      '& .MuiPaginationItem-root': {
                        borderRadius: 1
                      }
                    }}
                  />
                </Box>
              )}
            </motion.div>
          </>
        )}
      </Container>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: { 
            width: '90%', 
            maxWidth: 360, 
            p: 3,
            borderTopLeftRadius: '16px',
            borderBottomLeftRadius: '16px'
          },
        }}
      >
        <Stack spacing={3}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" fontWeight="600">
              Filtros
            </Typography>
            <IconButton onClick={() => setDrawerOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
          </Stack>
          
        <FilterPanel />
          
        <Box sx={{ mt: 2 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setDrawerOpen(false)}
              size="large"
              sx={{ 
                py: 1.5, 
                borderRadius: '30px',
                fontWeight: 600,
                boxShadow: '0 8px 16px rgba(127, 86, 217, 0.2)'
              }}
          >
            Aplicar Filtros
          </Button>
        </Box>
        </Stack>
      </Drawer>
    </Box>
  );
} 