interface VerovioToolkit {
    setOptions(options: any): void;
    loadData(data: string): boolean;
    getMEI(): string;
    renderToMIDI(): string;
  }
  
  class ConversionError extends Error {
    constructor(message: string, public details?: string) {
      super(message);
      this.name = 'ConversionError';
    }
  }

class LocalConversionService {
    private verovioToolkit: VerovioToolkit | null = null;

  constructor() {
      this.initializeToolkit();
    }
  
    private async initializeToolkit() {
      if (!this.verovioToolkit) {
        try {
          const verovioScript = document.createElement('script');
          verovioScript.src = 'https://www.verovio.org/javascript/latest/verovio-toolkit.js';
          document.head.appendChild(verovioScript);
  
          await new Promise((resolve, reject) => {
            verovioScript.onload = resolve;
            verovioScript.onerror = reject;
          });
  
          // @ts-ignore - Verovio é carregado globalmente
          this.verovioToolkit = new window.verovio.toolkit();
    } catch (error) {
          throw new ConversionError(
            'Falha ao inicializar o conversor',
            'Não foi possível carregar a biblioteca Verovio'
          );
        }
      }
    }
  
    public async convertToMEI(fileData: Uint8Array, originalFileName: string): Promise<Uint8Array> {
      try {
        await this.initializeToolkit();
        if (!this.verovioToolkit) {
          throw new ConversionError(
            'Conversor não inicializado',
            'O serviço de conversão não está disponível no momento'
          );
        }
  
        const fileExt = originalFileName.split('.').pop()?.toLowerCase() || '';
        
        const decoder = new TextDecoder();
        const fileContent = decoder.decode(fileData);
  
        this.verovioToolkit.setOptions({
          pageWidth: 2970,
          pageHeight: 2100,
          scale: 40,
          adjustPageHeight: true,
          mmOutput: true,
          footer: 'none'
        });
  
        let mei: string;
  
        if (['xml', 'musicxml', 'mxl'].includes(fileExt)) {
          const success = this.verovioToolkit.loadData(fileContent);
          if (!success) {
            throw new ConversionError(
              'Falha ao carregar partitura',
              'O arquivo MusicXML pode estar corrompido ou em formato inválido'
            );
          }
          mei = this.verovioToolkit.getMEI();
          if (!mei) {
            throw new ConversionError(
              'Falha na conversão',
              'Não foi possível gerar o arquivo MEI a partir do MusicXML'
            );
          }
        } else {
          throw new ConversionError(
            'Formato não suportado',
            'Use apenas arquivos MusicXML (.xml, .musicxml, .mxl)'
          );
        }
  
        const encoder = new TextEncoder();
        return encoder.encode(mei);
      } catch (error) {
        if (error instanceof ConversionError) {
          throw error;
        }
        throw new ConversionError(
          'Erro na conversão',
          error instanceof Error ? error.message : 'Erro desconhecido durante a conversão'
        );
      }
    }
  
    public async generateMIDI(meiData: Uint8Array): Promise<Uint8Array> {
      try {
        await this.initializeToolkit();
        if (!this.verovioToolkit) {
          throw new ConversionError(
            'Conversor não inicializado',
            'O serviço de conversão não está disponível no momento'
          );
        }
  
        const decoder = new TextDecoder();
        const meiString = decoder.decode(meiData);
  
        const success = this.verovioToolkit.loadData(meiString);
        if (!success) {
          throw new ConversionError(
            'Falha ao carregar MEI',
            'O arquivo MEI pode estar corrompido ou em formato inválido'
          );
        }
  
        const midiBase64 = this.verovioToolkit.renderToMIDI();
        if (!midiBase64) {
          throw new ConversionError(
            'Falha na geração do MIDI',
            'Não foi possível gerar o arquivo MIDI a partir do MEI'
          );
        }
  
        const binaryString = window.atob(midiBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
  
        return bytes;
      } catch (error) {
        if (error instanceof ConversionError) {
          throw error;
        }
        throw new ConversionError(
          'Erro na geração do MIDI',
          error instanceof Error ? error.message : 'Erro desconhecido durante a geração do MIDI'
        );
      }
      
    }
  
    public async validateSheet(fileData: Uint8Array, originalFileName: string): Promise<{ isValid: boolean; type: 'score' | 'chord' | 'unknown' }> {
      try {
        await this.initializeToolkit();
        if (!this.verovioToolkit) {
          throw new ConversionError(
            'Conversor não inicializado',
            'O serviço de conversão não está disponível no momento'
          );
        }
  
        const fileExt = originalFileName.split('.').pop()?.toLowerCase() || '';
        const decoder = new TextDecoder();
        const fileContent = decoder.decode(fileData);
  
        // Verifica se é um arquivo MusicXML
        if (['xml', 'musicxml', 'mxl'].includes(fileExt)) {
          const success = this.verovioToolkit.loadData(fileContent);
          if (!success) {
            return { isValid: false, type: 'unknown' };
          }
  
          // Verifica se contém elementos de partitura
          const hasScoreElements = fileContent.includes('<score-partwise') || 
                                 fileContent.includes('<score-timewise') ||
                                 fileContent.includes('<measure') ||
                                 fileContent.includes('<note>');
  
          // Verifica se contém elementos de cifra
          const hasChordElements = fileContent.includes('<harmony') ||
                                 fileContent.includes('<chord') ||
                                 fileContent.includes('<figured-bass');
  
          if (hasScoreElements && !hasChordElements) {
            return { isValid: true, type: 'score' };
          } else if (hasChordElements && !hasScoreElements) {
            return { isValid: true, type: 'chord' };
          } else if (hasScoreElements && hasChordElements) {
            // Se tiver ambos, considera como partitura
            return { isValid: true, type: 'score' };
          }
        }
  
        return { isValid: false, type: 'unknown' };
    } catch (error) {
        console.error('Erro na validação:', error);
        return { isValid: false, type: 'unknown' };
      }
  }
}

export const localConversionService = new LocalConversionService(); 