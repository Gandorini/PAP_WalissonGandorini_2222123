import { Factory } from 'vexflow';

interface SheetAnalysis {
  key: string;
  timeSignature: string;
  tempo: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  notes: number;
  measures: number;
  chords: string[];
}

class SheetAnalysisService {
  private factory: Factory;

  constructor() {
    this.factory = new Factory.Renderer(600, 400);
  }

  public async analyzeSheet(fileData: Uint8Array, fileType: string): Promise<SheetAnalysis> {
    try {
      const decoder = new TextDecoder();
      const content = decoder.decode(fileData);

      // Análise básica do arquivo
      const analysis: SheetAnalysis = {
        key: this.detectKey(content),
        timeSignature: this.detectTimeSignature(content),
        tempo: this.detectTempo(content),
        difficulty: this.calculateDifficulty(content),
        notes: this.countNotes(content),
        measures: this.countMeasures(content),
        chords: this.extractChords(content)
      };

      return analysis;
    } catch (error) {
      console.error('Erro na análise da partitura:', error);
      throw new Error('Falha ao analisar a partitura');
    }
  }

  private detectKey(content: string): string {
    // Procura por elementos de clave no MusicXML
    const keyMatch = content.match(/<key>.*?<fifths>(-?\d+)<\/fifths>.*?<\/key>/s);
    if (keyMatch) {
      const fifths = parseInt(keyMatch[1]);
      return this.getKeyFromFifths(fifths);
    }
    return 'C'; // Default para Dó maior
  }

  private getKeyFromFifths(fifths: number): string {
    const majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
    const index = (fifths + 7) % 12;
    return majorKeys[index];
  }

  private detectTimeSignature(content: string): string {
    const timeMatch = content.match(/<time>.*?<beats>(\d+)<\/beats>.*?<beat-type>(\d+)<\/beat-type>.*?<\/time>/s);
    if (timeMatch) {
      return `${timeMatch[1]}/${timeMatch[2]}`;
    }
    return '4/4'; // Default para 4/4
  }

  private detectTempo(content: string): number {
    const tempoMatch = content.match(/<sound.*?tempo="(\d+)".*?>/);
    if (tempoMatch) {
      return parseInt(tempoMatch[1]);
    }
    return 120; // Default para 120 BPM
  }

  private calculateDifficulty(content: string): 'beginner' | 'intermediate' | 'advanced' {
    const notes = this.countNotes(content);
    const measures = this.countMeasures(content);
    const chords = this.extractChords(content);
    
    // Lógica simples de dificuldade baseada em vários fatores
    const complexity = (notes / measures) * (chords.length / measures);
    
    if (complexity < 5) return 'beginner';
    if (complexity < 10) return 'intermediate';
    return 'advanced';
  }

  private countNotes(content: string): number {
    return (content.match(/<note>/g) || []).length;
  }

  private countMeasures(content: string): number {
    return (content.match(/<measure/g) || []).length;
  }

  private extractChords(content: string): string[] {
    const chords: string[] = [];
    const chordMatches = content.match(/<harmony>.*?<root>.*?<root-step>([A-G])<\/root-step>.*?<\/harmony>/g) || [];
    
    chordMatches.forEach(match => {
      const rootMatch = match.match(/<root-step>([A-G])<\/root-step>/);
      if (rootMatch) {
        chords.push(rootMatch[1]);
      }
    });

    return [...new Set(chords)]; // Remove duplicatas
  }

  public renderChord(chord: string, container: HTMLElement): void {
    const { factory } = this;
    const context = factory.getContext();
    const stave = new factory.Stave(10, 0, 100);
    
    stave.addClef('treble');
    stave.setContext(context).draw();

    const notes = [
      new factory.StaveNote({
        clef: 'treble',
        keys: [chord],
        duration: 'q'
      })
    ];

    const voice = new factory.Voice({ num_beats: 1, beat_value: 4 });
    voice.addTickables(notes);

    new factory.Formatter().joinVoices([voice]).format([voice], 100);
    voice.draw(context, stave);
  }
}

export const sheetAnalysisService = new SheetAnalysisService(); 