import axios from 'axios';

interface AdvancedAnalysis {
  key: string;
  time_signature: string;
  tempo: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  notes: number;
  measures: number;
  chords: string[];
  scales: string[];
  melody_contour: string[];
  rhythm_complexity: number;
  harmonic_complexity: number;
  technical_difficulty: number;
  expression_markers: string[];
  dynamics: string[];
  articulations: string[];
  recommended_instruments: string[];
}

class AdvancedAnalysisService {
  private readonly API_URL = 'http://localhost:8000';

  public async analyzeSheet(fileData: Uint8Array, fileName: string): Promise<AdvancedAnalysis> {
    try {
      const formData = new FormData();
      const blob = new Blob([fileData], { type: 'application/xml' });
      formData.append('file', blob, fileName);

      const response = await axios.post(`${this.API_URL}/analyze-sheet`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Erro na análise avançada:', error);
      throw new Error('Falha ao analisar a partitura com o serviço avançado');
    }
  }

  public getDifficultyColor(difficulty: number): string {
    if (difficulty < 0.3) return '#4CAF50'; // Verde para iniciante
    if (difficulty < 0.6) return '#FFC107'; // Amarelo para intermediário
    return '#F44336'; // Vermelho para avançado
  }

  public getDifficultyLabel(difficulty: number): string {
    if (difficulty < 0.3) return 'Iniciante';
    if (difficulty < 0.6) return 'Intermediário';
    return 'Avançado';
  }

  public getComplexityLabel(complexity: number): string {
    if (complexity < 0.3) return 'Baixa';
    if (complexity < 0.6) return 'Média';
    return 'Alta';
  }

  public getMelodyContourDescription(contour: string[]): string {
    const upCount = contour.filter(c => c === 'up').length;
    const downCount = contour.filter(c => c === 'down').length;
    const sameCount = contour.filter(c => c === 'same').length;

    if (upCount > downCount && upCount > sameCount) {
      return 'Melodia predominantemente ascendente';
    } else if (downCount > upCount && downCount > sameCount) {
      return 'Melodia predominantemente descendente';
    } else if (sameCount > upCount && sameCount > downCount) {
      return 'Melodia com muitas repetições';
    } else {
      return 'Melodia com variações equilibradas';
    }
  }
}

export const advancedAnalysisService = new AdvancedAnalysisService(); 