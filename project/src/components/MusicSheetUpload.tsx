import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Chip,
  Rating,
  CircularProgress,
  Alert,
} from '@mui/material';
import { CloudUpload, Clear } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface MusicSheetUploadProps {
  onUpload: (data: {
    title: string;
    composer: string;
    instrument: string;
    difficulty: number;
    description: string;
    sheetFile: File;
    midiFile?: File;
  }) => Promise<void>;
}

export default function MusicSheetUpload({ onUpload }: MusicSheetUploadProps) {
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [instrument, setInstrument] = useState('');
  const [difficulty, setDifficulty] = useState<number>(3);
  const [description, setDescription] = useState('');
  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const [midiFile, setMidiFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      if (file.type === 'application/pdf') {
        setSheetFile(file);
      } else if (file.type === 'audio/midi' || file.type === 'audio/mid') {
        setMidiFile(file);
      }
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'audio/midi': ['.midi', '.mid'],
    },
    multiple: true,
  });

  const handleSubmit = async () => {
    if (!sheetFile) {
      setError('Por favor, faça upload de uma partitura em PDF.');
      return;
    }

    if (!title || !composer || !instrument) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onUpload({
        title,
        composer,
        instrument,
        difficulty,
        description,
        sheetFile,
        midiFile: midiFile || undefined,
      });

      // Limpar o formulário após o upload bem-sucedido
      setTitle('');
      setComposer('');
      setInstrument('');
      setDifficulty(3);
      setDescription('');
      setSheetFile(null);
      setMidiFile(null);
    } catch (err) {
      setError('Ocorreu um erro ao fazer o upload. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 600, mx: 'auto', py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Upload de Partitura
      </Typography>

      <Paper
        {...getRootProps()}
        sx={{
          p: 3,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <input {...getInputProps()} />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <CloudUpload sx={{ fontSize: 48, color: 'primary.main' }} />
          <Typography align="center" color="textSecondary">
            {isDragActive
              ? 'Solte os arquivos aqui...'
              : 'Arraste e solte arquivos PDF e MIDI aqui, ou clique para selecionar'}
          </Typography>
          {(sheetFile || midiFile) && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {sheetFile && (
                <Chip
                  label={`PDF: ${sheetFile.name}`}
                  onDelete={() => setSheetFile(null)}
                  deleteIcon={<Clear />}
                />
              )}
              {midiFile && (
                <Chip
                  label={`MIDI: ${midiFile.name}`}
                  onDelete={() => setMidiFile(null)}
                  deleteIcon={<Clear />}
                />
              )}
            </Stack>
          )}
        </Box>
      </Paper>

      <Stack spacing={2}>
        <TextField
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Compositor"
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          required
          fullWidth
        />
        <TextField
          label="Instrumento"
          value={instrument}
          onChange={(e) => setInstrument(e.target.value)}
          required
          fullWidth
        />
        <Box>
          <Typography component="legend">Dificuldade</Typography>
          <Rating
            value={difficulty}
            onChange={(_, value) => setDifficulty(value || 3)}
            size="large"
          />
        </Box>
        <TextField
          label="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          rows={4}
          fullWidth
        />

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert severity="error">{error}</Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading ? 'Enviando...' : 'Enviar Partitura'}
        </Button>
      </Stack>
    </Stack>
  );
} 