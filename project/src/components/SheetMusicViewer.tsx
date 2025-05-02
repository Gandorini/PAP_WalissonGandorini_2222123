import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Slider,
  Typography,
  Stack,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Loop,
  Speed,
  ZoomIn,
  ZoomOut,
  Bookmark,
  Edit,
  VolumeUp,
  TransferWithinAStation,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { alpha } from '@mui/material/styles';

interface SheetMusicViewerProps {
  sheetUrl: string;
  midiUrl: string;
  onBookmark?: () => void;
  onEdit?: () => void;
}

export default function SheetMusicViewer({
  sheetUrl,
  midiUrl,
  onBookmark,
  onEdit,
}: SheetMusicViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loop, setLoop] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeNotes, setActiveNotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(75);
  const [transposeSteps, setTransposeSteps] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const synth = useRef<Tone.PolySynth>();
  const midi = useRef<Midi>();
  const scheduledEvents = useRef<number[]>([]);

  // Carregar partitura e MIDI
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    // Inicializar o sintetizador
    synth.current = new Tone.PolySynth().toDestination();
    synth.current.volume.value = Tone.gainToDb(volume / 100);
    
    // Resetar o transporte
    Tone.Transport.cancel();
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    
    // Limpar eventos agendados anteriores
    scheduledEvents.current.forEach(id => Tone.Transport.clear(id));
    scheduledEvents.current = [];

    // Carregar o arquivo MIDI
    if (midiUrl) {
      fetch(midiUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Falha ao carregar o arquivo MIDI');
          }
          return response.arrayBuffer();
        })
        .then((buffer) => {
          midi.current = new Midi(buffer);
          setDuration(midi.current.duration);
          
          // Configurar eventos de nota
          setupMidiEvents();
          setLoading(false);
        })
        .catch(err => {
          console.error('Erro ao carregar MIDI:', err);
          setError('Não foi possível carregar o arquivo MIDI. Verifique se o formato é suportado.');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    return () => {
      synth.current?.dispose();
      Tone.Transport.cancel();
      scheduledEvents.current.forEach(id => Tone.Transport.clear(id));
    };
  }, [midiUrl, transposeSteps]);

  // Configurar eventos MIDI
  const setupMidiEvents = () => {
    if (!midi.current || !synth.current) return;
    
    // Limpar eventos anteriores
    scheduledEvents.current.forEach(id => Tone.Transport.clear(id));
    scheduledEvents.current = [];
    
    // Para cada pista no arquivo MIDI
    midi.current.tracks.forEach((track) => {
      // Para cada nota na pista
      track.notes.forEach((note) => {
        // Agendar o início da nota
        const startId = Tone.Transport.schedule((time) => {
          // Aplicar transposição
          const transposedNote = transposeNote(note.name, transposeSteps);
          
          // Tocar a nota
          synth.current?.triggerAttackRelease(
            transposedNote,
            note.duration,
            time,
            note.velocity
          );
          
          // Atualizar notas ativas para destacar na interface
          setActiveNotes(prev => [...prev, transposedNote]);
          
          // Calcular a posição de rolagem baseada no tempo da nota
          if (containerRef.current) {
            const scrollPercentage = note.time / duration;
            const scrollMax = containerRef.current.scrollHeight - containerRef.current.clientHeight;
            const targetScroll = scrollMax * scrollPercentage * 0.8; // 0.8 para rolagem mais suave
            
            // Atualizar a posição de rolagem
            setScrollPosition(targetScroll);
          }
        }, note.time);
        
        // Agendar o fim da nota
        const endId = Tone.Transport.schedule((time) => {
          const transposedNote = transposeNote(note.name, transposeSteps);
          setActiveNotes(prev => prev.filter(n => n !== transposedNote));
        }, note.time + note.duration);
        
        // Armazenar IDs dos eventos para limpeza posterior
        scheduledEvents.current.push(startId, endId);
      });
    });
  };
  
  // Função para transpor uma nota
  const transposeNote = (noteName: string, steps: number): string => {
    if (steps === 0) return noteName;
    
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const regex = /([A-G][#b]?)(\d+)/;
    const match = noteName.match(regex);
    
    if (!match) return noteName;
    
    const [, note, octave] = match;
    const noteIndex = notes.indexOf(note);
    if (noteIndex === -1) return noteName;
    
    let newIndex = (noteIndex + steps) % 12;
    if (newIndex < 0) newIndex += 12;
    
    let octaveChange = Math.floor((noteIndex + steps) / 12);
    const newOctave = parseInt(octave) + octaveChange;
    
    return `${notes[newIndex]}${newOctave}`;
  };

  // Controle de reprodução
  const togglePlayback = async () => {
    if (!midi.current || !synth.current) return;

    // Inicializar o contexto de áudio se necessário (devido às políticas de autoplay)
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    if (isPlaying) {
      Tone.Transport.pause();
    } else {
      Tone.Transport.start();
    }
    setIsPlaying(!isPlaying);
  };

  // Atualizar progresso durante a reprodução
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        const currentTime = Tone.Transport.seconds;
        setProgress(currentTime);

        if (currentTime >= duration) {
          if (loop) {
            Tone.Transport.seconds = 0;
          } else {
            setIsPlaying(false);
          }
        }
      }
    }, 50); // Atualização mais frequente para melhor sincronização

    return () => clearInterval(interval);
  }, [isPlaying, duration, loop]);

  // Aplicar rolagem automática
  useEffect(() => {
    if (containerRef.current && isPlaying) {
      containerRef.current.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [scrollPosition, isPlaying]);

  // Controles de reprodução
  const handleProgressChange = (_: Event, newValue: number | number[]) => {
    const value = newValue as number;
    setProgress(value);
    Tone.Transport.seconds = value;
    
    // Resetar notas ativas ao buscar
    setActiveNotes([]);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    Tone.Transport.bpm.value = Tone.Transport.bpm.value * (speed / playbackRate);
  };

  const handleVolumeChange = (_: Event, newValue: number | number[]) => {
    const value = newValue as number;
    setVolume(value);
    if (synth.current) {
      synth.current.volume.value = Tone.gainToDb(value / 100);
    }
  };

  const handleTranspose = (steps: number) => {
    setTransposeSteps(prev => prev + steps);
  };

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.max(0.5, Math.min(2, prev + delta)));
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: theme => theme.palette.mode === 'light' ? '#FAFBFF' : '#1A1A2E',
        borderRadius: 3,
        p: 2
      }}
    >
      {/* Overlay de carregamento */}
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: theme => alpha(theme.palette.background.paper, 0.7),
            zIndex: 10,
            backdropFilter: 'blur(4px)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Stack spacing={2} alignItems="center">
              <CircularProgress size={60} thickness={4} />
              <Typography variant="h6" fontWeight="medium">
                Carregando partitura...
              </Typography>
            </Stack>
          </motion.div>
        </Box>
      )}

      {/* Mensagem de erro */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 2, 
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          {error}
        </Alert>
      )}

      {/* Container principal da partitura */}
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          position: 'relative',
          overflow: 'auto',
          borderRadius: 2,
          border: theme => `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          boxShadow: '0 8px 20px rgba(0,0,0,0.05)',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: theme => theme.palette.mode === 'light' ? '#f1f1f1' : '#333',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: theme => theme.palette.mode === 'light' ? '#D0D5DD' : '#666',
            borderRadius: '4px',
            '&:hover': {
              background: theme => theme.palette.mode === 'light' ? '#98A2B3' : '#888',
            },
          },
          mb: 2,
        }}
        ref={containerRef}
        style={{ scrollTop: scrollPosition }}
      >
        {/* Iframe para visualização da partitura */}
        <Box
          component="iframe"
          src={sheetUrl}
          title="Music Sheet Viewer"
          sx={{
            width: '100%',
            height: '100%',
            border: 'none',
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.3s ease',
          }}
        />

        {/* Notas ativas (highlight) */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            maxWidth: '80%',
          }}
        >
          <AnimatePresence>
            {activeNotes.map((note) => (
              <motion.div
                key={note}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ duration: 0.2 }}
              >
                <Chip
                  label={note}
                  color="primary"
                  size="small"
                  sx={{
                    fontWeight: 'bold',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(4px)',
                    background: theme => 
                      `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.9)} 0%, ${alpha(theme.palette.secondary.main, 0.9)} 100%)`,
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </Box>
      </Paper>

      {/* Controles de reprodução */}
      <Box 
        sx={{ 
          p: 2, 
          borderRadius: 3,
          background: theme => theme.palette.mode === 'light' 
            ? `linear-gradient(to bottom, ${alpha(theme.palette.primary.light, 0.05)} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)` 
            : `linear-gradient(to bottom, ${alpha('#2D2D3A', 0.8)} 0%, ${alpha('#1E1E2F', 0.9)} 100%)`,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
          border: theme => `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        {/* Slider de progresso */}
        <Box sx={{ mb: 1, px: 2 }}>
          <Slider
            value={progress}
            onChange={handleProgressChange}
            min={0}
            max={100}
            sx={{
              color: 'primary.main',
              height: 4,
              '& .MuiSlider-thumb': {
                width: 16,
                height: 16,
                transition: '0.3s cubic-bezier(.47,1.64,.41,.8)',
                '&::before': {
                  boxShadow: '0 2px 12px 0 rgba(0,0,0,0.4)',
                },
                '&:hover, &.Mui-focusVisible': {
                  boxShadow: `0px 0px 0px 8px ${alpha('#7F56D9', 0.16)}`,
                },
                '&.Mui-active': {
                  width: 20,
                  height: 20,
                },
              },
              '& .MuiSlider-rail': {
                opacity: 0.32,
              },
            }}
          />
        </Box>

        {/* Linha de tempo e controles */}
        <Stack 
          direction="row" 
          alignItems="center" 
          justifyContent="space-between"
          spacing={2}
        >
          {/* Tempo atual/total */}
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
            {formatTime(progress * duration / 100)} / {formatTime(duration)}
          </Typography>
          
          {/* Controles principais */}
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
            {/* Botão de loop */}
            <IconButton
              color={loop ? 'primary' : 'default'}
              onClick={() => setLoop(!loop)}
              sx={{ 
                bgcolor: loop ? alpha('#7F56D9', 0.1) : 'transparent',
                '&:hover': {
                  bgcolor: loop ? alpha('#7F56D9', 0.2) : alpha('#7F56D9', 0.05),
                },
                transition: 'all 0.2s ease',
              }}
            >
              <Loop />
            </IconButton>
            
            {/* Botão de transposição para baixo */}
            <IconButton
              onClick={() => handleTranspose(-1)}
              sx={{ 
                '&:hover': {
                  bgcolor: alpha('#7F56D9', 0.05),
                },
                transition: 'all 0.2s ease',
              }}
            >
              <Typography component="span" fontWeight="bold">♭</Typography>
            </IconButton>

            {/* Botão de reprodução/pausa */}
            <IconButton
              color="primary"
              onClick={togglePlayback}
              sx={{
                width: 56,
                height: 56,
                background: theme => 
                  `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                color: 'white',
                '&:hover': {
                  background: theme => 
                    `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
                },
                boxShadow: '0 4px 14px rgba(127, 86, 217, 0.4)',
                transition: 'all 0.3s ease',
              }}
            >
              <motion.div
                animate={{ 
                  scale: isPlaying ? [1, 1.1, 1] : 1,
                  rotate: isPlaying ? [0, 10, 0] : 0,
                }}
                transition={{ 
                  repeat: isPlaying ? Infinity : 0, 
                  duration: 2,
                }}
              >
                {isPlaying ? <Pause fontSize="large" /> : <PlayArrow fontSize="large" />}
              </motion.div>
            </IconButton>

            {/* Botão de transposição para cima */}
            <IconButton
              onClick={() => handleTranspose(1)}
              sx={{ 
                '&:hover': {
                  bgcolor: alpha('#7F56D9', 0.05),
                },
                transition: 'all 0.2s ease',
              }}
            >
              <Typography component="span" fontWeight="bold">♯</Typography>
            </IconButton>
            
            {/* Botão de volume */}
            <Box sx={{ width: 100, display: 'flex', alignItems: 'center' }}>
              <VolumeUp 
                fontSize="small" 
                sx={{ mr: 1, color: 'text.secondary' }} 
              />
              <Slider
                size="small"
                value={volume}
                onChange={handleVolumeChange}
                min={0}
                max={100}
                sx={{
                  color: 'primary.main',
                  '& .MuiSlider-thumb': {
                    width: 12,
                    height: 12,
                  },
                }}
              />
            </Box>
          </Stack>
          
          {/* Controles secundários */}
          <Stack direction="row" spacing={1} sx={{ minWidth: 80 }}>
            <IconButton
              onClick={() => handleZoom(0.1)}
              size="small"
              sx={{ 
                bgcolor: 'background.paper',
                border: theme => `1px solid ${theme.palette.divider}`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                '&:hover': {
                  bgcolor: alpha('#7F56D9', 0.05),
                },
              }}
            >
              <ZoomIn fontSize="small" />
            </IconButton>
            <IconButton
              onClick={() => handleZoom(-0.1)}
              size="small"
              sx={{ 
                bgcolor: 'background.paper',
                border: theme => `1px solid ${theme.palette.divider}`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                '&:hover': {
                  bgcolor: alpha('#7F56D9', 0.05),
                },
              }}
            >
              <ZoomOut fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
        
        {/* Controles de velocidade */}
        <Stack 
          direction="row" 
          spacing={1} 
          justifyContent="center" 
          mt={2}
          sx={{
            p: 1,
            borderRadius: 2,
            bgcolor: theme => alpha(theme.palette.background.paper, 0.5),
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ width: 70 }}>
            Velocidade:
          </Typography>
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
            <Chip
              key={speed}
              label={speed === 1 ? 'Normal' : `${speed}x`}
              size="small"
              onClick={() => handleSpeedChange(speed)}
              color={playbackRate === speed ? 'primary' : 'default'}
              variant={playbackRate === speed ? 'filled' : 'outlined'}
              sx={{ 
                minWidth: 58,
                fontWeight: playbackRate === speed ? 600 : 400,
                transition: 'all 0.2s',
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)'
                }
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* Speed dial para ações adicionais */}
      <SpeedDial
        ariaLabel="Ações adicionais"
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
        }}
        icon={<SpeedDialIcon />}
        FabProps={{
          sx: {
            bgcolor: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            boxShadow: '0 4px 14px rgba(127, 86, 217, 0.4)',
          }
        }}
      >
        {onBookmark && (
          <SpeedDialAction
            key="bookmark"
            icon={<Bookmark />}
            tooltipTitle="Salvar nos favoritos"
            onClick={onBookmark}
          />
        )}
        {onEdit && (
          <SpeedDialAction
            key="edit"
            icon={<Edit />}
            tooltipTitle="Editar partitura"
            onClick={onEdit}
          />
        )}
        <SpeedDialAction
          key="transpose"
          icon={<TransferWithinAStation />}
          tooltipTitle="Transposição"
          tooltipOpen
        />
      </SpeedDial>
    </Box>
  );
}

// Função auxiliar para formatar o tempo
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
} 