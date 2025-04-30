import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { saveAs } from 'file-saver';
// PDFDocument será usado para manipulação de PDFs no futuro
import { PDFDocument } from 'pdf-lib';

interface ProgressEvent {
  loaded: number;
  total: number;
}

export const useUpload = () => {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const convertToMEI = async (file: File): Promise<string> => {
    try {
      const fileContent = await file.text();
      const fileType = file.name.endsWith('.xml') ? 'musicxml' : 'pdf';

      const response = await fetch('https://sheets-converter.onrender.com/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileContent, fileType }),
      });

      if (!response.ok) {
        throw new Error('Erro na conversão');
      }

      const data = await response.json();
      return data.meiContent;
    } catch (err) {
      throw new Error('Erro na conversão para MEI');
    }
  };

  const uploadFile = async (file: File, userId: string) => {
    try {
      setLoading(true);
      setError('');
      setSuccess(false);
      setUploadProgress(0);

      // Converter para MEI
      const meiContent = await convertToMEI(file);
      
      // Salvar o arquivo original
      const filePath = `${userId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('sheets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Salvar o MEI
      const meiPath = `${userId}/${file.name.replace(/\.[^/.]+$/, '')}.mei`;
      const { error: meiUploadError } = await supabase.storage
        .from('sheets')
        .upload(meiPath, new Blob([meiContent]), {
          cacheControl: '3600',
          upsert: false
        });

      if (meiUploadError) throw meiUploadError;

      setUploadProgress(100);
      setSuccess(true);
      return { originalPath: filePath, meiPath };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from('sheets')
        .download(filePath);

      if (error) throw error;
      if (!data) throw new Error('Arquivo não encontrado');

      saveAs(data, fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao baixar arquivo');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files;
      }
    }
  };

  return {
    loading,
    uploadProgress,
    error,
    success,
    dragActive,
    fileInputRef,
    uploadFile,
    downloadFile,
    handleDrag,
    handleDrop
  };
}; 