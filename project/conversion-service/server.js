// Serviço de Conversão de Partituras para API no Render.com
// Instrução: Este arquivo deve ser hospedado em um serviço Web no Render.com

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

// Configurar variáveis de ambiente
dotenv.config();

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/status/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Configurar Multer para uploads temporários
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './temp';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Inicializar cliente Supabase com Service Role Key (mais permissões)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const execPromise = promisify(exec);

// Rotas da API
app.get('/status/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      return res.status(400).json({ error: 'ID do arquivo é obrigatório' });
    }
    
    // Verificar status da conversão
    const { data, error } = await supabase
      .from('music_sheets')
      .select('conversion_status, conversion_error')
      .eq('id', fileId)
      .single();
      
    if (error) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    return res.json({
      status: data.conversion_status,
      error: data.conversion_error || null
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    return res.status(500).json({ error: 'Erro ao verificar status da conversão' });
  }
});

app.post('/convert', async (req, res) => {
  try {
    const { fileId, filePath, fileType } = req.body;
    
    if (!fileId || !filePath) {
      return res.status(400).json({ error: 'Dados obrigatórios ausentes' });
    }
    
    // Atualizar status para "processando"
    const { error: updateError } = await supabase
      .from('music_sheets')
      .update({ conversion_status: 'processing' })
      .eq('id', fileId);
      
    if (updateError) {
      throw updateError;
    }
    
    // Iniciar o processo de conversão em background
    processFile(fileId, filePath, fileType)
      .then(result => {
        console.log(`Conversão do arquivo ${fileId} concluída:`, result);
      })
      .catch(error => {
        console.error(`Erro na conversão do arquivo ${fileId}:`, error);
        
        // Atualizar status para erro em caso de falha
        supabase
          .from('music_sheets')
          .update({
            conversion_status: 'failed',
            conversion_error: error.message || 'Erro desconhecido durante a conversão'
          })
          .eq('id', fileId)
          .then(() => {
            console.log(`Status de erro atualizado para o arquivo ${fileId}`);
          })
          .catch(updateError => {
            console.error(`Erro ao atualizar status de erro para o arquivo ${fileId}:`, updateError);
          });
      });
    
    // Retornar resposta imediatamente
    return res.json({
      success: true,
      message: 'Processo de conversão iniciado com sucesso',
      fileId,
      status: 'processing'
    });
  } catch (error) {
    console.error('Erro ao iniciar conversão:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro desconhecido ao iniciar a conversão' 
    });
  }
});

// Função para processar a conversão
async function processFile(fileId, filePath, fileType) {
  try {
    // Criar diretório de trabalho temporário
    const tempDir = path.join('./temp', fileId);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Baixar o arquivo do Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('music-sheets')
      .download(filePath);
      
    if (downloadError) {
      throw new Error(`Erro ao baixar arquivo: ${downloadError.message}`);
    }
    
    // Extrair nome do arquivo
    const fileName = path.basename(filePath);
    const tempFilePath = path.join(tempDir, fileName);
    
    // Salvar o arquivo localmente
    fs.writeFileSync(tempFilePath, Buffer.from(await fileData.arrayBuffer()));
    
    // Determinar fluxo de conversão baseado no tipo de arquivo
    const fileExt = path.extname(fileName).toLowerCase().substring(1);
    let musicXmlPath, meiPath;
    
    // Simulação de conversão (ou chamada real para ferramentas externas)
    if (fileExt === 'pdf') {
      // PDF -> MusicXML usando Audiveris (simulado aqui)
      const musicXmlFileName = path.basename(fileName, '.pdf') + '.musicxml';
      musicXmlPath = path.join(tempDir, musicXmlFileName);
      
      console.log(`Convertendo PDF para MusicXML: ${tempFilePath} -> ${musicXmlPath}`);
      
      // Em produção, você chamaria Audiveris aqui
      // await execPromise(`audiveris -batch -export -output "${tempDir}" "${tempFilePath}"`);
      
      // Simulação: criar um arquivo MusicXML básico
      const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
  </part>
</score-partwise>`;
      
      fs.writeFileSync(musicXmlPath, sampleXml);
      
    } else if (['xml', 'musicxml', 'mxl'].includes(fileExt)) {
      // Já é MusicXML
      musicXmlPath = tempFilePath;
    } else {
      throw new Error(`Formato não suportado: ${fileExt}`);
    }
    
    // Conversão MusicXML -> MEI usando Verovio ou similar
    const meiFileName = path.basename(fileName, path.extname(fileName)) + '.mei';
    meiPath = path.join(tempDir, meiFileName);
    
    console.log(`Convertendo MusicXML para MEI: ${musicXmlPath} -> ${meiPath}`);
    
    // Em produção, você chamaria Verovio ou outra ferramenta de conversão
    // await execPromise(`verovio --from musicxml --to mei "${musicXmlPath}" -o "${meiPath}"`);
    
    // Simulação: criar um arquivo MEI básico
    const meiTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-model href="https://music-encoding.org/schema/4.0.0/mei-all.rng" type="application/xml" schematypens="http://relaxng.org/ns/structure/1.0"?>
<mei xmlns="http://www.music-encoding.org/ns/mei" meiversion="4.0.0">
  <meiHead>
    <fileDesc>
      <titleStmt>
        <title>Arquivo convertido de ${fileName}</title>
      </titleStmt>
      <pubStmt>
        <date isodate="${new Date().toISOString().substring(0, 10)}"/>
      </pubStmt>
    </fileDesc>
  </meiHead>
  <music>
    <body>
      <mdiv>
        <score>
          <scoreDef>
            <staffGrp>
              <staffDef n="1" lines="5" clef.shape="G" clef.line="2"/>
            </staffGrp>
          </scoreDef>
          <section>
            <measure n="1">
              <staff n="1">
                <layer n="1">
                  <note pname="c" oct="4" dur="1"/>
                </layer>
              </staff>
            </measure>
          </section>
        </score>
      </mdiv>
    </body>
  </music>
</mei>`;
    
    fs.writeFileSync(meiPath, meiTemplate);
    
    // Upload do arquivo MEI para o Storage
    const userId = filePath.split('/')[0]; // Extrair ID do usuário do caminho
    const meiStoragePath = `${userId}/${meiFileName}`;
    
    const meiContent = fs.readFileSync(meiPath);
    const { error: uploadError } = await supabase.storage
      .from('music-sheets')
      .upload(meiStoragePath, meiContent, {
        contentType: 'application/mei+xml',
        cacheControl: '3600'
      });
      
    if (uploadError) {
      throw uploadError;
    }
    
    // Obter URL pública do arquivo MEI
    const { data: publicUrlData } = await supabase.storage
      .from('music-sheets')
      .getPublicUrl(meiStoragePath);
      
    const meiPublicUrl = publicUrlData?.publicUrl || null;
    
    // Atualizar registro na base de dados
    const { error: finalUpdateError } = await supabase
      .from('music_sheets')
      .update({
        conversion_status: 'completed',
        mei_url: meiStoragePath,
        mei_public_url: meiPublicUrl
      })
      .eq('id', fileId);
      
    if (finalUpdateError) {
      throw finalUpdateError;
    }
    
    // Limpar arquivos temporários
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    return {
      mei_url: meiStoragePath,
      public_url: meiPublicUrl
    };
  } catch (error) {
    console.error('Erro no processamento do arquivo:', error);
    
    // Atualizar status para falha
    await supabase
      .from('music_sheets')
      .update({ 
        conversion_status: 'failed',
        conversion_error: error.message || 'Erro desconhecido'
      })
      .eq('id', fileId);
      
    throw error;
  }
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Serviço de conversão rodando na porta ${PORT}`);
});

// Endpoint de verificação de saúde para o Render.com
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Sheet Music Conversion API',
    version: '1.0.0'
  });
});

export default app; 