import React, { useEffect, useRef } from 'react';
import Vex from 'vexflow';
import { Box, Paper, Typography } from '@mui/material';

interface ChordVisualizerProps {
  chord: string;
  width?: number;
  height?: number;
}

const ChordVisualizer: React.FC<ChordVisualizerProps> = ({ 
  chord, 
  width = 200, 
  height = 100 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<any>(null);

  useEffect(() => {
    if (containerRef.current && !rendererRef.current) {
      rendererRef.current = new Vex.Flow.Renderer(
        containerRef.current,
        Vex.Flow.Renderer.Backends.SVG
      );
    }

    const renderChord = () => {
      if (!containerRef.current || !rendererRef.current) return;

      const context = rendererRef.current.getContext();
      context.clear();

      // Criar a pauta
      const stave = new Vex.Flow.Stave(10, 0, width - 20);
      stave.addClef('treble');
      stave.setContext(context).draw();

      // Criar a nota
      const notes = [
        new Vex.Flow.StaveNote({
          clef: 'treble',
          keys: [chord],
          duration: 'q'
        })
      ];

      // Adicionar acidente se necessário
      if (chord.includes('#')) {
        notes[0].addAccidental(0, new Vex.Flow.Accidental('#'));
      } else if (chord.includes('b')) {
        notes[0].addAccidental(0, new Vex.Flow.Accidental('b'));
      }

      // Criar a voz e formatar
      const voice = new Vex.Flow.Voice({ num_beats: 1, beat_value: 4 });
      voice.addTickables(notes);

      new Vex.Flow.Formatter().joinVoices([voice]).format([voice], width - 40);
      voice.draw(context, stave);
    };

    renderChord();
  }, [chord, width, height]);

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 2, 
        borderRadius: 2,
        display: 'inline-block',
        bgcolor: 'background.paper'
      }}
    >
      <Box ref={containerRef} />
      <Typography 
        variant="caption" 
        align="center" 
        display="block" 
        sx={{ mt: 1 }}
      >
        {chord}
      </Typography>
    </Paper>
  );
};

export default ChordVisualizer; 