import React, { useEffect, useRef } from 'react';
import { Factory } from 'vexflow';
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
  const factoryRef = useRef<Factory.Renderer | null>(null);

  useEffect(() => {
    if (containerRef.current && !factoryRef.current) {
      factoryRef.current = new Factory.Renderer(width, height);
    }

    const renderChord = () => {
      if (!containerRef.current || !factoryRef.current) return;

      const { factory } = factoryRef.current;
      const context = factory.getContext();
      
      // Limpar o canvas
      context.clear();
      
      // Criar a pauta
      const stave = new factory.Stave(10, 0, width - 20);
      stave.addClef('treble');
      stave.setContext(context).draw();

      // Criar a nota
      const notes = [
        new factory.StaveNote({
          clef: 'treble',
          keys: [chord],
          duration: 'q'
        })
      ];

      // Adicionar acidente se necessário
      if (chord.includes('#')) {
        notes[0].addAccidental(0, new factory.Accidental('#'));
      } else if (chord.includes('b')) {
        notes[0].addAccidental(0, new factory.Accidental('b'));
      }

      // Criar a voz e formatar
      const voice = new factory.Voice({ num_beats: 1, beat_value: 4 });
      voice.addTickables(notes);

      new factory.Formatter().joinVoices([voice]).format([voice], width - 40);
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