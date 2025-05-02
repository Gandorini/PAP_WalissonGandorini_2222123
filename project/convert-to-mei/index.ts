import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Interface para tipagem da requisição
interface ConversionRequest {
  fileId?: string;
  filePath?: string;
  fileType?: string;
}

serve(async (req) => {
  try {
    // Verificar o método da requisição
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Método não permitido" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    // Obter variáveis de ambiente do Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variáveis de ambiente do Supabase não configuradas");
    }
    
    // Criar o cliente do Supabase com a chave de serviço para acesso total
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let fileId: string, filePath: string, fileType: string;
    
    // Verificar se estamos processando um arquivo específico ou todos
    const url = new URL(req.url);
    const processAll = url.pathname.includes("/convert-all");
    
    if (processAll) {
      // Modo de processamento em lote - processar todos os arquivos pendentes
      console.log("Iniciando processamento em lote de todos os arquivos pendentes");
      
      // Buscar arquivos com status de conversão pendente
      const { data: pendingFiles, error: queryError } = await supabase
        .from("music_sheets")
        .select("id, file_url, file_type")
        .eq("conversion_status", "pending")
        .limit(10); // Limitar para não sobrecarregar
      
      if (queryError) {
        throw new Error(`Erro ao buscar arquivos pendentes: ${queryError.message}`);
      }
      
      if (!pendingFiles || pendingFiles.length === 0) {
        return new Response(
          JSON.stringify({ message: "Nenhum arquivo pendente para conversão" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Processar cada arquivo
      const results = [];
      for (const file of pendingFiles) {
        try {
          // Processar o arquivo
          const result = await processFile(supabase, file.id, file.file_url, file.file_type);
          results.push({
            fileId: file.id,
            success: true,
            result
          });
        } catch (error) {
          console.error(`Erro ao processar arquivo ${file.id}:`, error);
          results.push({
            fileId: file.id,
            success: false,
            error: error instanceof Error ? error.message : "Erro desconhecido"
          });
          
          // Atualizar o status para falha
          await supabase
            .from("music_sheets")
            .update({ 
              conversion_status: "failed",
              conversion_error: error instanceof Error ? error.message : "Erro desconhecido"
            })
            .eq("id", file.id);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          message: "Processamento em lote concluído", 
          results 
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      // Modo de processamento individual - processar apenas o arquivo especificado
      // Extrair os dados da requisição
      const requestData = await req.json() as ConversionRequest;
      fileId = requestData.fileId || "";
      filePath = requestData.filePath || "";
      fileType = requestData.fileType || "";
      
      // Validar os dados
      if (!fileId || !filePath) {
        return new Response(
          JSON.stringify({ error: "Dados obrigatórios ausentes" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Processar o arquivo
      const result = await processFile(supabase, fileId, filePath, fileType);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Conversão concluída com sucesso",
          result
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Erro na Edge Function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erro desconhecido"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * Processa um único arquivo, convertendo-o para o formato MEI
 */
async function processFile(
  supabase: any, 
  fileId: string, 
  filePath: string, 
  fileType: string
) {
  console.log(`Iniciando conversão para MEI. ID: ${fileId}, Caminho: ${filePath}, Tipo: ${fileType}`);
  
  // Atualizar status para "processando"
  const { error: updateError } = await supabase
    .from("music_sheets")
    .update({ conversion_status: "processing" })
    .eq("id", fileId);
    
  if (updateError) {
    console.error("Erro ao atualizar status:", updateError);
    throw updateError;
  }
  
  try {
    // Baixar o arquivo do Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("music-sheets")
      .download(filePath);
      
    if (downloadError) {
      console.error("Erro ao baixar arquivo:", downloadError);
      throw new Error(`Erro ao baixar arquivo: ${downloadError.message}`);
    }
    
    // Criar diretório temporário para trabalhar com os arquivos
    const tempDir = `/tmp/convert-${fileId}`;
    try {
      await Deno.mkdir(tempDir, { recursive: true });
    } catch (e) {
      console.log("Diretório temporário já existe ou erro ao criar:", e);
    }
    
    // Extrair nome do arquivo
    const fileName = filePath.split("/").pop() || "file";
    const tempFilePath = `${tempDir}/${fileName}`;
    
    // Salvar o arquivo localmente
    await Deno.writeFile(tempFilePath, new Uint8Array(await fileData.arrayBuffer()));
    
    // Determinar fluxo de conversão com base no tipo de arquivo
    const fileExt = (fileName.split(".").pop() || "").toLowerCase();
    let musicXmlPath, meiPath;
    
    if (fileExt === "pdf") {
      // PDF -> MusicXML -> MEI 
      // Simulação: em um ambiente de produção, você chamaria Audiveris
      console.log("Simulando conversão de PDF para MusicXML...");
      
      // Simular um atraso de processamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Caminho para o arquivo MusicXML intermediário
      musicXmlPath = tempFilePath.replace(".pdf", ".musicxml");
      
      // Simular criação de um arquivo MusicXML - em produção, seria gerado pelo Audiveris
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
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
  </part>
</score-partwise>`;
      
      await Deno.writeTextFile(musicXmlPath, sampleXml);
    } else if (["xml", "musicxml", "mxl"].includes(fileExt)) {
      // Já é MusicXML, só precisamos converter para MEI
      musicXmlPath = tempFilePath;
    } else if (fileExt === "svg") {
      // SVG é um caso especial, precisa de tratamento diferente
      // Para este exemplo, vamos simular uma conversão direta para MEI
      console.log("Simulando conversão de SVG para MEI...");
      
      // Simular um atraso de processamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Neste caso não há XML intermediário
      musicXmlPath = null;
    } else {
      throw new Error(`Tipo de arquivo não suportado: ${fileExt}`);
    }
    
    // Conversão de MusicXML para MEI - simulado aqui
    console.log("Simulando conversão para MEI...");
    
    // Gerar nome para o arquivo MEI
    const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    meiPath = `${tempDir}/${fileNameWithoutExt}.mei`;
    
    // Simular a conversão MusicXML -> MEI
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
    
    // Salvar arquivo MEI simulado
    await Deno.writeTextFile(meiPath, meiTemplate);
    
    // Simular atraso de processamento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Ler o arquivo MEI
    const meiContent = await Deno.readFile(meiPath);
    
    // Nome do arquivo MEI a ser salvo no Supabase
    const userId = filePath.substring(0, filePath.lastIndexOf('/'));
    const meiFileName = `${userId}/${fileNameWithoutExt}.mei`;
    
    // Salvar no Storage do Supabase
    const { error: uploadError } = await supabase.storage
      .from("music-sheets")
      .upload(meiFileName, meiContent, {
        contentType: "application/mei+xml",
        cacheControl: "3600"
      });
      
    if (uploadError) {
      console.error("Erro ao fazer upload do MEI:", uploadError);
      throw uploadError;
    }
    
    // Obter URL pública do arquivo MEI
    const { data: publicUrlData } = await supabase.storage
      .from("music-sheets")
      .getPublicUrl(meiFileName);
      
    const meiPublicUrl = publicUrlData?.publicUrl || null;
    
    // Atualizar registro com URL do MEI e status de conclusão
    const { error: finalUpdateError } = await supabase
      .from("music_sheets")
      .update({
        conversion_status: "completed",
        mei_url: meiFileName,
        mei_public_url: meiPublicUrl
      })
      .eq("id", fileId);
      
    if (finalUpdateError) {
      console.error("Erro ao atualizar registro com URL do MEI:", finalUpdateError);
      throw finalUpdateError;
    }
    
    // Limpar arquivos temporários
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch (e) {
      console.error("Erro ao limpar diretório temporário:", e);
      // Não falhar por isso
    }
    
    return {
      mei_url: meiFileName,
      public_url: meiPublicUrl
    };
  } catch (error) {
    // Se ocorrer algum erro, atualizar o status para falha
    await supabase
      .from("music_sheets")
      .update({ 
        conversion_status: "failed",
        conversion_error: error instanceof Error ? error.message : "Erro desconhecido"
      })
      .eq("id", fileId);
      
    throw error;
  }
} 