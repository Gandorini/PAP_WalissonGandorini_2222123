import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { saveAs } from 'file-saver';

export const useUpload = () => {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload direto para o Supabase Storage
  const uploadFile = async (file: File, path: string) => {
    try {
      setLoading(true);
      setError('');
      setSuccess(false);
      setUploadProgress(0);
      const { error: uploadError, data } = await supabase.storage
        .from('music-sheets')
        .upload(path, file, { upsert: false });
      setUploadProgress(100);
      setSuccess(true);
      if (uploadError) throw new Error(uploadError.message);
      return data;
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer upload');
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