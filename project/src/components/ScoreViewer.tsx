import { useEffect, useRef, useState, type FC } from 'react';
import { toolkit } from 'verovio';
import { supabase } from '../lib/supabase';

interface ScoreViewerProps {
  meiUrl: string;
  onError?: (error: string) => void;
}

export const ScoreViewer: FC<ScoreViewerProps> = ({ meiUrl, onError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const verovioRef = useRef<toolkit | null>(null);

  useEffect(() => {
    const initVerovio = async () => {
      try {
        // Inicializar Verovio
        const vrv = new toolkit();
        verovioRef.current = vrv;

        // Carregar o arquivo MEI
        const { data: meiData, error } = await supabase.storage
          .from('music-sheets')
          .download(meiUrl);

        if (error) throw error;

        const meiContent = await meiData.text();
        vrv.loadData(meiContent);

        // Renderizar a partitura
        if (containerRef.current) {
          const svg = vrv.renderToSVG(1);
          containerRef.current.innerHTML = svg;
        }

        // Configurar audio playback
        const audio = new Audio();
        audioRef.current = audio;

        // Gerar audio a partir do MEI
        const audioData = vrv.renderToMIDI();
        const audioBlob = new Blob([audioData], { type: 'audio/midi' });
        audio.src = URL.createObjectURL(audioBlob);

        audio.addEventListener('timeupdate', () => {
          setCurrentTime(audio.currentTime);
        });

        audio.addEventListener('loadedmetadata', () => {
          setDuration(audio.duration);
        });

        audio.addEventListener('ended', () => {
          setIsPlaying(false);
          setCurrentTime(0);
        });

      } catch (error) {
        console.error('Erro ao carregar partitura:', error);
        onError?.(error instanceof Error ? error.message : 'Erro ao carregar partitura');
      }
    };

    initVerovio();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, [meiUrl, onError]);

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div 
        ref={containerRef} 
        className="w-full max-w-4xl overflow-auto border rounded-lg shadow-lg"
      />
      
      <div className="flex items-center gap-4 w-full max-w-4xl">
        <button
          onClick={togglePlayback}
          className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600"
        >
          {isPlaying ? 'Pausar' : 'Tocar'}
        </button>
        
        <input
          type="range"
          min={0}
          max={duration}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1"
        />
        
        <span className="text-sm text-gray-600">
          {Math.floor(currentTime)}s / {Math.floor(duration)}s
        </span>
      </div>
    </div>
  );
}; 