import { CONVERSION_API_URL } from './supabase';

/**
 * Serviço para comunicação com a API de conversão de partituras
 */
export const conversionService = {
  /**
   * Inicia o processo de conversão de partitura.
   * @param fileId ID do arquivo no banco de dados
   * @param filePath Caminho do arquivo no Supabase Storage
   * @param fileType Tipo do arquivo (extensão)
   * @returns Resposta da API
   */
  startConversion: async (fileId: string, filePath: string, fileType: string) => {
    try {
      console.log(`Iniciando conversão para o arquivo ${fileId} (${filePath})`);
      
      const response = await fetch(`${CONVERSION_API_URL}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          filePath,
          fileType
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro na conversão: ${errorData.error || response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao iniciar conversão:', error);
      throw error;
    }
  },
  
  /**
   * Verifica o status de uma conversão em andamento
   * @param fileId ID do arquivo no banco de dados
   * @returns Status da conversão
   */
  checkConversionStatus: async (fileId: string) => {
    try {
      const response = await fetch(`${CONVERSION_API_URL}/status/${fileId}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro ao verificar status: ${errorData.error || response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao verificar status de conversão:', error);
      throw error;
    }
  }
}; 