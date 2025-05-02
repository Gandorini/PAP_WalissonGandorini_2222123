import { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';

export const useAudioPlayback = (meiContent: string) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const synthRef = useRef<Tone.PolySynth | null>(null);

  useEffect(() => {
    // Inicializar o sintetizador
    synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination();

    // Analisar o MEI e extrair as notas
    const parseMEI = async () => {
      try {
        // Aqui você precisará implementar a lógica para extrair as notas do MEI
        // e criar uma sequência de notas para o Tone.js
        // Esta é uma implementação simplificada
        const notes = []; // Array de notas extraídas do MEI
        
        // Criar a sequência
        const sequence = new Tone.Sequence(
          (time, note) => {
            synthRef.current?.triggerAttackRelease(note, '8n', time);
          },
          notes,
          '8n'
        );

        setDuration(sequence.duration);
        return sequence;
      } catch (error) {
        console.error('Erro ao analisar MEI:', error);
        return null;
      }
    };

    const sequence = parseMEI();

    return () => {
      sequence?.then(seq => seq.dispose());
      synthRef.current?.dispose();
    };
  }, [meiContent]);

  const play = async () => {
    if (!synthRef.current) return;
    
    try {
      await Tone.start();
      await Tone.Transport.start();
      setIsPlaying(true);
    } catch (error) {
      console.error('Erro ao iniciar reprodução:', error);
    }
  };

  const pause = () => {
    Tone.Transport.pause();
    setIsPlaying(false);
  };

  const stop = () => {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const seek = (time: number) => {
    Tone.Transport.seconds = time;
    setCurrentTime(time);
  };

  return {
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    stop,
    seek
  };
}; 