import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { localConversionService } from '../services/localConversionService';
import { sheetAnalysisService } from '../services/sheetAnalysisService';
import { advancedAnalysisService } from '../services/advancedAnalysisService';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  Paper, 
  Stack, 
  Container,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  FormHelperText,
  CircularProgress,
  Alert,
  Divider,
  useTheme,
  alpha,
  IconButton,
  Tabs,
  Tab,
  Card,
  CardMedia,
  LinearProgress,
  Snackbar
} from '@mui/material';
import { 
  CloudUpload as UploadIcon, 
  CloudUpload,
  MusicNote as MusicIcon,
  CloudDone as CloudDoneIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  PlayArrow as PlayIcon,
  MusicNote,
  Warning as WarningIcon,
  LibraryMusic
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import ChordVisualizer from '../components/ChordVisualizer';


// Componente para exibir o status da conversão
const ConversionStatus = ({ status }: { status: 'pending' | 'processing' | 'completed' | 'failed' | null }) => {
  if (!status) return null;

  let message = '';
  let color = '';
  
  switch (status) {
    case 'pending':
      message = 'Aguardando conversão para MEI...';
      color = 'info.main';
      break;
    case 'processing':
      message = 'Convertendo partitura para MEI...';
      color = 'warning.main';
      break;
    case 'completed':
      message = 'Conversão para MEI concluída!';
      color = 'success.main';
      break;
    case 'failed':
      message = 'Falha na conversão para MEI. Tente novamente.';
      color = 'error.main';
      break;
  }
  
  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        {status === 'processing' && <CircularProgress size={16} />}
        <Typography variant="body2" color={color}>
          {message}
        </Typography>
      </Stack>
    </Box>
  );
};

// Tamanho máximo do arquivo em bytes (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const Upload = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const midiInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    composer: '',
    instrument: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    tags: [] as string[],
    scales: [] as string[],
    file: null as File | null,
    midiFile: null as File | null,
    conversionStatus: null as 'pending' | 'processing' | 'completed' | 'failed' | null,
  });
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isValidFile, setIsValidFile] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState('');
  
  // Estado para a pré-visualização
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [tabValue, setTabValue] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const osmdRef = useRef<HTMLDivElement>(null);
  const [osmdInstance, setOsmdInstance] = useState<OpenSheetMusicDisplay | null>(null);

  const scales = [
    'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#',
    'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb',
    'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m', 'E#m',
    'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm', 'Dbm', 'Gbm', 'Cbm'
  ];

  const instruments = [
    'Piano', 'Violino', 'Violoncelo', 'Guitarra', 'Baixo', 
    'Flauta', 'Saxofone', 'Clarinete', 'Trompete', 
    'Bateria', 'Voz', 'Outro'
  ];

  // Gerar URL de pré-visualização quando o arquivo mudar
  useEffect(() => {
    if (formData.file) {
      setIsLoading(true);
      
      // Verificar o tamanho do arquivo
      if (formData.file.size > MAX_FILE_SIZE) {
        setError(`O arquivo excede o tamanho máximo permitido (5MB).`);
        setIsValidFile(false);
        setValidationMessage('Arquivo muito grande. O limite é 5MB.');
        setIsLoading(false);
        return;
      }
      
      // Se for PDF, validamos apenas o tamanho
      if (formData.file.type === 'application/pdf') {
        setIsValidFile(true);
        setValidationMessage('PDF aceito para upload.');
        setIsLoading(false);
      }
      
      // Limpar URL anterior para evitar vazamento de memória
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      // Criar URL temporária para o arquivo
      const fileUrl = URL.createObjectURL(formData.file);
      setPreviewUrl(fileUrl);
      
      // Mostrar a aba de pré-visualização
      setTabValue(1);
      
      // Simular um pequeno delay para garantir que o objeto seja carregado
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
      
      // Limpeza ao desmontar o componente
      return () => {
        URL.revokeObjectURL(fileUrl);
      };
    } else {
      setPreviewUrl(null);
      setTabValue(0);
      setIsValidFile(null);
      setValidationMessage('');
      setIsLoading(false);
    }
  }, [formData.file]);

  // Inicialize o OSMD
  useEffect(() => {
    if (osmdRef.current && !osmdInstance) {
      const osmd = new OpenSheetMusicDisplay(osmdRef.current);
      osmd.setOptions({
        autoResize: true,
        drawTitle: true,
        drawSubtitle: true,
        drawComposer: true
      });
      setOsmdInstance(osmd);
    }
  }, [osmdInstance]);

  // Carregue o arquivo quando selecionado
  useEffect(() => {
    if (formData.file && osmdInstance) {
      const fileExt = formData.file.name.split('.').pop()?.toLowerCase();
      
      // Apenas validar MusicXML/SVG com OSMD
      if (['xml', 'musicxml', 'mxl', 'svg'].includes(fileExt || '')) {
        const fileReader = new FileReader();
        
        fileReader.onload = (e) => {
          const fileContent = e.target?.result as string;
          try {
            osmdInstance.load(fileContent)
              .then(() => {
                osmdInstance.render();
                setPdfLoading(false);
                setIsValidFile(true);
                setValidationMessage('Partitura válida! Pronta para upload.');
                console.log('Partitura validada com sucesso pelo OSMD');
              })
              .catch((err: Error) => {
                console.error('Erro ao validar partitura com OSMD:', err);
                setError('Erro ao renderizar a partitura: ' + err.message);
                setPdfLoading(false);
                setIsValidFile(false);
                setValidationMessage('Formato de partitura inválido. Verifique se é um arquivo MusicXML válido.');
              });
          } catch (err) {
            console.error('Exceção ao carregar arquivo com OSMD:', err);
            setError('Formato de arquivo não suportado');
            setPdfLoading(false);
            setIsValidFile(false);
            setValidationMessage('Formato de partitura inválido ou não suportado pelo visualizador.');
          }
        };
        
        // SVG pode ser carregado como texto
        if (formData.file.type === 'image/svg+xml') {
          fileReader.readAsText(formData.file);
        } 
        // MusicXML também é carregado como texto
        else {
          fileReader.readAsText(formData.file);
        }
      } else if (fileExt === 'pdf') {
        // PDF não pode ser verificado com OSMD, mas podemos mostrar como preview
        setIsValidFile(true);
        setValidationMessage('PDF aceito. Não é possível verificar a estrutura interna.');
      } else {
        setIsValidFile(false);
        setValidationMessage('Tipo de arquivo não suportado. Use MusicXML, SVG ou PDF.');
      }
    }
  }, [formData.file, osmdInstance]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange({ target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>, 'sheet');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'sheet' | 'midi') => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      if (fileType === 'sheet') {
        try {
          // Verificar extensão de arquivo
          const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
          const validFileTypes = ['xml', 'musicxml', 'mxl', 'svg', 'pdf', 'mid', 'midi'];
          
          if (!fileExt || !validFileTypes.includes(fileExt)) {
            setError(`Tipo de arquivo não suportado. Apenas MusicXML, SVG, PDF e MIDI são aceitos.`);
            return;
          }
          
          // Verificar tamanho
          if (selectedFile.size > MAX_FILE_SIZE) {
            setError(`O arquivo excede o tamanho máximo permitido (5MB).`);
            return;
          }

          // Enviar para o backend para análise automática
          const formDataBackend = new FormData();
          formDataBackend.append('file', selectedFile);
          setIsLoading(true);
          setValidationMessage('Analisando arquivo...');
          setIsValidFile(null);
          setError('');
          
          const response = await fetch('http://localhost:8000/analyze-sheet', {
            method: 'POST',
            body: formDataBackend
          });
          const analysis = await response.json();
          setIsLoading(false);
          if (!response.ok) {
            setError(analysis.detail || 'Erro ao analisar arquivo.');
              setIsValidFile(false);
            setValidationMessage('Arquivo inválido ou não suportado.');
              return;
            }

          // Preencher automaticamente os campos do formulário
            setFormData(prev => ({
              ...prev,
              file: selectedFile,
            title: analysis.title || prev.title,
            composer: analysis.composer || prev.composer,
            instrument: analysis.instrument || prev.instrument,
            difficulty: analysis.difficulty || prev.difficulty,
            scales: analysis.scales || prev.scales,
              tags: [...new Set([
                ...prev.tags,
              ...(analysis.chords || []),
              ...(analysis.expression_markers || []),
              ...(analysis.dynamics || []),
              ...(analysis.articulations || [])
              ])]
            }));
            setIsValidFile(true);
          setValidationMessage('Arquivo analisado e campos preenchidos automaticamente!');
          setChordVisualization(analysis.chords || []);
        } catch (error) {
          console.error('Erro ao validar/analisar arquivo:', error);
          setError('Erro ao processar o arquivo. Por favor, tente novamente.');
          setIsValidFile(false);
          setValidationMessage('Erro na validação do arquivo.');
          setIsLoading(false);
        }
      } else {
        // Validação do arquivo MIDI
        if (selectedFile.size > MAX_FILE_SIZE) {
          setError(`O arquivo MIDI excede o tamanho máximo permitido (5MB).`);
          return;
        }
        setFormData(prev => ({ ...prev, midiFile: selectedFile }));
      }
    }
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData({ ...formData, tags });
  };

  // Funções para o PDF
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfLoading(false);
  };

  const changePage = (offset: number) => {
    if (numPages) {
      setPageNumber(prevPageNumber => {
        const newPage = prevPageNumber + offset;
        return Math.min(Math.max(1, newPage), numPages);
      });
    }
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const simulateProgress = () => {
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + 5;
      });
    }, 200);
    
    return () => clearInterval(interval);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.id) {
      setError('Sessão expirada. Por favor, faça login novamente.');
      return;
    }

    try {
      // Validação do formulário
      if (!formData.title || !formData.composer || !formData.instrument) {
        setError('Por favor, preencha todos os campos obrigatórios.');
        return;
      }

      if (!formData.file) {
        setError('Por favor, selecione um arquivo de partitura para upload.');
        return;
      }
      
      if (isValidFile === false) {
        setError('O arquivo selecionado não é válido. Por favor, selecione outro arquivo.');
        return;
      }

      setLoading(true);
      setError('');
      setUploadProgress(0);
      
      // Iniciar animação de progresso
      const cleanupProgress = simulateProgress();

      console.log('Iniciando processo de upload...');
      
      // Upload do arquivo de partitura
      const fileExt = formData.file.name.split('.').pop()?.toLowerCase() || '';
      const fileName = `${Date.now()}-${formData.file.name}`;
      const filePath = `${user.id}/${fileName}`;

      console.log('Enviando para o Storage:', filePath);
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('music-sheets')
        .upload(filePath, formData.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Erro no upload do arquivo:', uploadError);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }
      
      console.log('Upload concluído com sucesso:', uploadData);

      // Upload do arquivo MIDI (se fornecido)
      let midiUrl = null;
      if (formData.midiFile) {
        console.log('Iniciando upload do MIDI...');
        
        const midiExt = formData.midiFile.name.split('.').pop();
        const midiFileName = `${Date.now()}-${formData.midiFile.name}`;
        const midiFilePath = `${user.id}/${midiFileName}`;

        const { error: midiUploadError, data: midiUploadData } = await supabase.storage
          .from('music-sheets')
          .upload(midiFilePath, formData.midiFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (midiUploadError) {
          console.error('Erro no upload do MIDI:', midiUploadError);
          throw new Error(`Erro no upload do MIDI: ${midiUploadError.message}`);
        }
        
        midiUrl = midiUploadData.path;
        console.log('Upload do MIDI concluído:', midiUrl);
      }

      // Determinar o tipo de arquivo
      let fileType = '';
      if (fileExt === 'pdf') {
        fileType = 'pdf';
      } else if (['xml', 'musicxml', 'mxl'].includes(fileExt)) {
        fileType = 'musicxml';
      } else if (fileExt === 'svg') {
        fileType = 'svg';
      }

      console.log('Tipo de arquivo determinado:', fileType);

      // Preparar dados para inserção no banco
      const dataToInsert = {
        title: formData.title,
        composer: formData.composer,
        instrument: formData.instrument,
        difficulty: formData.difficulty,
        tags: formData.tags,
        scales: formData.scales,
        file_url: uploadData.path,
        midi_url: midiUrl,
        file_type: fileType,
        user_id: user.id,
        conversion_status: 'completed',
        mei_url: null
      };
      
      console.log('Dados a serem inseridos na tabela:', dataToInsert);

      // Criar registro no banco de dados
      const { error: insertError, data: insertData } = await supabase
        .from('music_sheets')
        .insert(dataToInsert)
        .select();

      if (insertError) {
        console.error('Erro ao inserir no banco:', insertError);
        throw new Error(`Erro ao salvar no banco: ${insertError.message}`);
      }
      
      console.log('Registro criado com sucesso no banco de dados');

      // Reset do formulário
      setFormData({
        title: '',
        composer: '',
        instrument: '',
        difficulty: 'beginner',
        tags: [],
        scales: [],
        file: null,
        midiFile: null,
        conversionStatus: null,
      });
      
      setUploadProgress(100);
      setSuccess(true);
      
      // Redirecionar após upload bem-sucedido
      setTimeout(() => {
        navigate('/library');
      }, 2000);
      
    } catch (err) {
      console.error('Erro completo durante o processo de upload:', err);
      setError(err instanceof Error ? err.message : 'Ocorreu um erro durante o upload. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  const removeFile = (fileType: 'sheet' | 'midi') => {
    if (fileType === 'sheet') {
      setFormData({ ...formData, file: null });
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setIsValidFile(null);
      setValidationMessage('');
    } else {
      setFormData({ ...formData, midiFile: null });
      if (midiInputRef.current) midiInputRef.current.value = '';
    }
  };

  const handleMidiButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    midiInputRef.current?.click();
  };

  // Gradiente de fundo animado
  const gradientColors = [
    `${alpha(theme.palette.primary.main, 0.15)}`, 
    `${alpha(theme.palette.secondary.main, 0.1)}`,
    `${alpha(theme.palette.primary.light, 0.2)}`,
    `${alpha(theme.palette.secondary.light, 0.15)}`
  ];

  const [chordVisualization, setChordVisualization] = useState<string[] | null>(null);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
          <Paper 
          elevation={0}
            sx={{ 
            mb: 4, 
            p: 3, 
              borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.12)} 0%, ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Box 
                        sx={{
              position: 'absolute', 
              top: -20, 
              right: -20, 
              width: 180, 
              height: 180, 
              borderRadius: '50%', 
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.3)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 100%)`,
              zIndex: 0 
            }} 
          />
          
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={2} mb={2}>
              <LibraryMusic fontSize="large" color="primary" />
              <Typography variant="h4" component="h1" fontWeight="bold" color="primary.main">
                Compartilhe sua Partitura
                        </Typography>
            </Stack>
            
            <Typography variant="body1" color="text.secondary" mb={2}>
              Faça upload de partituras nos formatos MusicXML, SVG ou PDF para compartilhar com a comunidade.
                        </Typography>
          </Box>
        </Paper>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert 
              severity="error" 
              sx={{ mb: 3, borderRadius: 2 }}
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert 
              severity="success" 
              sx={{ mb: 3, borderRadius: 2 }}
              onClose={() => setSuccess(false)}
            >
              Partitura enviada com sucesso!
            </Alert>
          </motion.div>
        )}

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Paper 
                elevation={2} 
                            sx={{ 
                  p: 3, 
                  borderRadius: 2,
                  height: '100%',
                              display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Typography variant="h6" fontWeight="medium" mb={3} color="primary">
                        Informações da Partitura
                      </Typography>
                
                <form onSubmit={handleSubmit}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                          fullWidth
                        label="Título da Partitura"
                        name="title"
                          value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        required
                          variant="outlined"
                        sx={{ mb: 2 }}
                        />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                        label="Compositor"
                        name="composer"
                          value={formData.composer}
                        onChange={(e) => setFormData({...formData, composer: e.target.value})}
                        required
                          variant="outlined"
                        sx={{ mb: 2 }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel id="instrument-label">Instrumento</InputLabel>
                          <Select
                          labelId="instrument-label"
                            value={formData.instrument}
                            label="Instrumento"
                          onChange={(e) => setFormData({...formData, instrument: e.target.value})}
                          required
                          >
                            {instruments.map((instrument) => (
                              <MenuItem key={instrument} value={instrument}>
                                {instrument}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel id="difficulty-label">Nível de Dificuldade</InputLabel>
                          <Select
                          labelId="difficulty-label"
                            value={formData.difficulty}
                          label="Nível de Dificuldade"
                          onChange={(e) => setFormData({
                            ...formData, 
                            difficulty: e.target.value as 'beginner' | 'intermediate' | 'advanced'
                          })}
                          required
                          >
                            <MenuItem value="beginner">Iniciante</MenuItem>
                            <MenuItem value="intermediate">Intermediário</MenuItem>
                            <MenuItem value="advanced">Avançado</MenuItem>
                          </Select>
                        </FormControl>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel id="scales-label">Escalas/Tonalidades</InputLabel>
                        <Select
                          labelId="scales-label"
                          multiple
                          value={formData.scales}
                          label="Escalas/Tonalidades"
                          onChange={(e) => setFormData({
                            ...formData,
                            scales: e.target.value as string[]
                          })}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {(selected as string[]).map((value) => (
                                <Chip key={value} label={value} size="small" />
                              ))}
                            </Box>
                          )}
                        >
                          {scales.map((scale) => (
                            <MenuItem key={scale} value={scale}>
                              {scale}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Tags (separadas por vírgula)"
                        name="tags"
                        value={formData.tags.join(', ')}
                        onChange={handleTagsChange}
                        variant="outlined"
                        sx={{ mb: 3 }}
                      />
                    </Grid>
                  </Grid>
                  
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    disabled={loading || !formData.file || (!isValidFile && formData.file?.type !== 'application/pdf')}
                    startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <CloudUpload />}
                    sx={{ 
                      mt: 2, 
                      py: 1.2,
                      borderRadius: 2,
                      boxShadow: theme.shadows[4],
                      background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      '&:hover': {
                        background: `linear-gradient(90deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                      }
                    }}
                  >
                    {loading ? 'Enviando...' : 'Enviar Partitura'}
                  </Button>
                  
                  {loading && (
                    <Box sx={{ width: '100%', mt: 2 }}>
                      <LinearProgress variant="determinate" value={uploadProgress} />
                      <Typography variant="caption" color="text.secondary" align="center" display="block" mt={1}>
                        {uploadProgress < 100 ? `Enviando (${uploadProgress}%)` : 'Processando...'}
                      </Typography>
                    </Box>
                  )}
                </form>
              </Paper>
            </motion.div>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Paper 
                elevation={2}
                sx={{ 
                  p: 3, 
                  borderRadius: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Box>
                  <Tabs 
                    value={tabValue} 
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
                  >
                    <Tab 
                      label="Upload" 
                      icon={<CloudUpload />} 
                      iconPosition="start" 
                    />
                    <Tab 
                      label="Pré-visualização" 
                      icon={<VisibilityIcon />} 
                      iconPosition="start"
                      disabled={!formData.file} 
                    />
                  </Tabs>
                </Box>

                {tabValue === 0 && (
                  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box
                      sx={{
                        border: `2px dashed ${dragActive ? theme.palette.primary.main : theme.palette.divider}`,
                        borderRadius: 2,
                        p: 4,
                        textAlign: 'center',
                        backgroundColor: dragActive 
                          ? alpha(theme.palette.primary.main, 0.05)
                          : alpha(theme.palette.background.default, 0.4),
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        mb: 3,
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".xml,.musicxml,.mxl,.pdf,.svg"
                        onChange={(e) => handleFileChange(e, 'sheet')}
                      />
                      
                      {formData.file ? (
                    <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                            <CloudDoneIcon color="success" sx={{ fontSize: 60 }} />
                          </Box>
                          <Typography variant="h6" gutterBottom>
                            {formData.file.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                          </Typography>
                          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                            <Button
                              variant="outlined"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile('sheet');
                              }}
                              startIcon={<DeleteIcon />}
                              size="small"
                              sx={{ mr: 1, borderRadius: 4 }}
                            >
                              Remover
                            </Button>
                            <Button
                              variant="outlined"
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTabValue(1);
                              }}
                              startIcon={<VisibilityIcon />}
                              size="small"
                              sx={{ borderRadius: 4 }}
                            >
                              Visualizar
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                            <CloudUpload color="primary" sx={{ fontSize: 60 }} />
                          </Box>
                          <Typography variant="h6" gutterBottom>
                            Arraste e solte sua partitura aqui
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            ou clique para selecionar
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                            Formatos aceitos: MusicXML (.xml, .musicxml, .mxl), PDF, SVG
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Tamanho máximo: 5MB
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    
                    {isValidFile !== null && (
                      <Alert 
                        severity={isValidFile ? "success" : "error"}
                        sx={{ mt: 1, mb: 2, borderRadius: 2 }}
                      >
                        {validationMessage}
                      </Alert>
                    )}
                    
                    <Divider sx={{ my: 3 }}>
                      <Chip label="Arquivo MIDI (opcional)" size="small" />
                    </Divider>
                    
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<MusicNote />}
                      onClick={handleMidiButtonClick}
                      sx={{ borderRadius: 2, p: 1.5, flex: '0 0 auto' }}
                    >
                      {formData.midiFile ? 'Alterar arquivo MIDI' : 'Adicionar arquivo MIDI'}
                    </Button>
                    <input
                      type="file"
                      ref={midiInputRef}
                      style={{ display: 'none' }}
                      accept=".mid,.midi"
                      onChange={(e) => handleFileChange(e, 'midi')}
                    />
                    
                    {formData.midiFile && (
                      <Box sx={{ mt: 2 }}>
                        <Paper 
                          variant="outlined" 
                          sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <MusicNote color="primary" sx={{ mr: 1 }} />
                            <Box>
                              <Typography variant="body2">{formData.midiFile.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {(formData.midiFile.size / 1024).toFixed(2)} KB
                              </Typography>
                            </Box>
                          </Box>
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => removeFile('midi')}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Paper>
                      </Box>
                    )}
                    
                    <ConversionStatus status={formData.conversionStatus} />
                  </Box>
                )}
                
                {tabValue === 1 && (
                  <Box 
                    sx={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      overflow: 'hidden',
                      position: 'relative',
                      height: 'calc(100vh - 300px)',
                      minHeight: 600,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      mt: 2
                    }}
                  >
                    {isLoading ? (
                      <Box 
                        sx={{ 
                          position: 'absolute', 
                          top: 0, 
                          left: 0, 
                          right: 0, 
                          bottom: 0, 
                          display: 'flex', 
                          flexDirection: 'column',
                          justifyContent: 'center', 
                          alignItems: 'center',
                          zIndex: 10,
                          bgcolor: alpha(theme.palette.background.paper, 0.7)
                        }}
                      >
                        <CircularProgress size={40} />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                          Carregando visualização...
                        </Typography>
                      </Box>
                    ) : formData.file && previewUrl ? (
                      formData.file.type === 'application/pdf' ? (
                        <Box sx={{ 
                          flex: 1,
                          height: '100%',
                          width: '100%',
                          position: 'relative',
                          overflow: 'hidden',
                          '& iframe': {
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            display: 'block'
                          }
                        }}>
                          <iframe
                            src={previewUrl + '#zoom=FitH'}
                            style={{
                              width: '100%',
                              height: '100%',
                              border: 'none',
                              display: 'block'
                            }}
                            title="PDF Preview"
                          />
                        </Box>
                      ) : (
                        <Box 
                          ref={osmdRef} 
                          sx={{ 
                            flex: 1, 
                            overflowY: 'auto', 
                            p: 2
                          }}
                        />
                      )
                    ) : (
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          height: '100%'
                        }}
                      >
                        <Typography color="text.secondary">
                          Nenhum arquivo selecionado para visualização
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Paper>
            </motion.div>
          </Grid>
        </Grid>

        {chordVisualization && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Acordes Detectados
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {chordVisualization.map((chord, index) => (
                <ChordVisualizer key={index} chord={chord} />
              ))}
            </Box>
          </Box>
        )}
      </motion.div>
    </Container>
  );
};

export default Upload;  