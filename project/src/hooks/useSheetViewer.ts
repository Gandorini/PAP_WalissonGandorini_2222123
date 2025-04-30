import { useState, useRef, useEffect } from 'react';
import { OpenSheetMusicDisplay as OSMD } from 'opensheetmusicdisplay';

export const useSheetViewer = () => {
  const [osmdInstance, setOsmdInstance] = useState<OSMD | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const osmdRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (osmdRef.current && !osmdInstance) {
      const osmd = new OSMD(osmdRef.current);
      setOsmdInstance(osmd);
    }
  }, [osmdRef.current]);

  const loadSheet = async (xmlContent: string) => {
    if (!osmdInstance) return;

    try {
      setLoading(true);
      setError('');

      await osmdInstance.load(xmlContent);
      osmdInstance.render();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar partitura');
    } finally {
      setLoading(false);
    }
  };

  const zoom = (factor: number) => {
    if (!osmdInstance) return;
    osmdInstance.render();
  };

  return {
    osmdRef,
    osmdInstance,
    loading,
    error,
    loadSheet,
    zoom
  };
}; 