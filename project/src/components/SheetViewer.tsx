import { useEffect, useRef } from 'react';
import { OpenSheetMusicDisplay as OSMD } from 'opensheetmusicdisplay';

interface SheetViewerProps {
  meiContent: string;
}

export const SheetViewer = ({ meiContent }: SheetViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OSMD | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Inicializar OpenSheetMusicDisplay
    const osmd = new OSMD(containerRef.current);
    
    // Configurar opções
    osmd.setOptions({
      autoResize: true,
      backend: 'svg',
      drawTitle: true,
      drawSubtitle: true,
      drawComposer: true,
      drawLyricist: true,
      drawPartNames: true,
      drawMeasureNumbers: true,
      drawFingerings: true,
      drawCredits: true,
      drawPartAbbreviations: true,
      drawPartGroups: true
    });

    osmdRef.current = osmd;

    // Carregar e renderizar a partitura
    const loadAndRender = async () => {
      try {
        await osmd.load(meiContent);
        await osmd.render();
      } catch (error) {
        console.error('Erro ao renderizar partitura:', error);
      }
    };

    loadAndRender();

    // Limpar ao desmontar
    return () => {
      if (osmdRef.current) {
        osmdRef.current = null;
      }
    };
  }, [meiContent]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        overflow: 'auto',
        backgroundColor: '#fff',
        padding: '20px'
      }}
    />
  );
}; 