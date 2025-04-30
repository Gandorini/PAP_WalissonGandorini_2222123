import { NextApiRequest, NextApiResponse } from 'next';
import * as verovio from 'verovio';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { fileContent, fileType } = req.body;

    if (!fileContent || !fileType) {
      return res.status(400).json({ error: 'Conteúdo do arquivo e tipo são obrigatórios' });
    }

    const toolkit = new verovio.toolkit();
    
    // Configurar Verovio
    toolkit.setOptions({
      inputFormat: fileType,
      pageHeight: 2970,
      pageWidth: 2100,
      scale: 40,
      adjustPageHeight: true,
      adjustPageWidth: true,
      noLayout: false,
      noJustification: false,
      breaks: 'encoded',
      spacingNonLinear: 0.4,
      spacingStaff: 0.4,
      spacingSystem: 0.4
    });

    // Converter para MEI
    const meiContent = toolkit.convertData(fileContent, 'mei');
    
    if (!meiContent) {
      throw new Error('Falha na conversão para MEI');
    }

    return res.status(200).json({ meiContent });
  } catch (error) {
    console.error('Erro na conversão:', error);
    return res.status(500).json({ error: 'Erro na conversão da partitura' });
  }
} 