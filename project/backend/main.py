from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from music21 import *
import json
import tempfile
import os
from typing import Dict, List, Optional
import numpy as np
from sheets_crud import router as sheets_router
from supabase import create_client

app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SheetAnalysis:
    def __init__(self):
        self.title = ""
        self.composer = ""
        self.instrument = ""
        self.key = ""
        self.time_signature = ""
        self.tempo = 0
        self.difficulty = ""
        self.notes = 0
        self.measures = 0
        self.chords = []
        self.scales = []
        self.melody_contour = []
        self.rhythm_complexity = 0
        self.harmonic_complexity = 0
        self.technical_difficulty = 0
        self.expression_markers = []
        self.dynamics = []
        self.articulations = []
        self.recommended_instruments = []

def analyze_melody_contour(score: stream.Score) -> List[str]:
    """Analisa o contorno melódico da partitura"""
    contour = []
    for part in score.parts:
        for measure in part.getElementsByClass('Measure'):
            for note in measure.getElementsByClass('Note'):
                if len(contour) == 0:
                    contour.append('start')
                elif note.pitch.midi > contour[-1]:
                    contour.append('up')
                elif note.pitch.midi < contour[-1]:
                    contour.append('down')
                else:
                    contour.append('same')
    return contour

def calculate_rhythm_complexity(score: stream.Score) -> float:
    """Calcula a complexidade rítmica da partitura"""
    rhythm_values = []
    for part in score.parts:
        for measure in part.getElementsByClass('Measure'):
            for note in measure.getElementsByClass('Note'):
                rhythm_values.append(note.quarterLength)
    
    if not rhythm_values:
        return 0
    
    # Calcula a variância dos valores rítmicos
    return np.var(rhythm_values)

def analyze_harmonic_complexity(score: stream.Score) -> float:
    """Analisa a complexidade harmônica da partitura"""
    chords = []
    for part in score.parts:
        for measure in part.getElementsByClass('Measure'):
            chord = measure.getElementsByClass('Chord')
            if chord:
                chords.append(len(chord[0].pitches))
    
    if not chords:
        return 0
    
    # Calcula a média de notas por acorde
    return np.mean(chords)

def detect_expression_markers(score: stream.Score) -> List[str]:
    """Detecta marcadores de expressão na partitura"""
    markers = []
    for part in score.parts:
        for element in part.getElementsByClass(['Dynamic', 'Expression']):
            markers.append(element.value)
    return list(set(markers))

def analyze_technical_difficulty(score: stream.Score) -> float:
    """Analisa a dificuldade técnica da partitura"""
    factors = {
        'rhythm': calculate_rhythm_complexity(score),
        'harmony': analyze_harmonic_complexity(score),
        'range': 0,
        'tempo': 0
    }
    
    # Análise de extensão
    for part in score.parts:
        notes = part.getElementsByClass('Note')
        if notes:
            pitches = [note.pitch.midi for note in notes]
            factors['range'] = max(pitches) - min(pitches)
    
    # Análise de tempo
    for part in score.parts:
        tempos = part.getElementsByClass('MetronomeMark')
        if tempos:
            factors['tempo'] = tempos[0].number
    
    # Cálculo final da dificuldade
    difficulty = (
        factors['rhythm'] * 0.3 +
        factors['harmony'] * 0.3 +
        (factors['range'] / 12) * 0.2 +
        (factors['tempo'] / 200) * 0.2
    )
    
    return min(max(difficulty, 0), 1)

@app.post("/analyze-sheet")
async def analyze_sheet(file: UploadFile = File(...)) -> Dict:
    try:
        # Detectar tipo de arquivo pelo sufixo
        filename = file.filename.lower()
        if filename.endswith('.pdf'):
            suffix = '.pdf'
        elif filename.endswith('.xml') or filename.endswith('.musicxml'):
            suffix = '.xml'
        elif filename.endswith('.midi') or filename.endswith('.mid'):
            suffix = '.midi'
        else:
            raise HTTPException(status_code=400, detail="Formato de arquivo não suportado. Envie PDF, MusicXML ou MIDI.")

        # Criar arquivo temporário com o sufixo correto
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file.flush()

            # Carregar partitura com Music21
            try:
                score = converter.parse(temp_file.name)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Arquivo não suportado ou inválido: {str(e)}")
            
            # Realizar análise
            analysis = SheetAnalysis()
            
            # Análise básica
            # Extração de metadados
            analysis.title = score.metadata.title if score.metadata and score.metadata.title else ""
            analysis.composer = score.metadata.composer if score.metadata and score.metadata.composer else ""
            # Instrumento principal
            analysis.instrument = score.parts[0].partName if score.parts and hasattr(score.parts[0], 'partName') and score.parts[0].partName else ""
            analysis.key = score.analyze('key').tonic.name
            analysis.time_signature = str(score.getTimeSignatures()[0])
            analysis.tempo = score.metronomeMarkBoundaries()[0][2].number
            analysis.notes = len(score.getElementsByClass('Note'))
            analysis.measures = len(score.getElementsByClass('Measure'))
            
            # Análise de acordes
            for chord in score.getElementsByClass('Chord'):
                analysis.chords.append(chord.pitchedCommonName)
            
            # Análise de escalas
            for scale in score.getElementsByClass('Scale'):
                analysis.scales.append(scale.name)
            
            # Análises avançadas
            analysis.melody_contour = analyze_melody_contour(score)
            analysis.rhythm_complexity = calculate_rhythm_complexity(score)
            analysis.harmonic_complexity = analyze_harmonic_complexity(score)
            analysis.technical_difficulty = analyze_technical_difficulty(score)
            analysis.expression_markers = detect_expression_markers(score)
            
            # Análise de dinâmicas
            for dynamic in score.getElementsByClass('Dynamic'):
                analysis.dynamics.append(dynamic.value)
            
            # Análise de articulações
            for articulation in score.getElementsByClass('Articulation'):
                analysis.articulations.append(articulation.name)
            
            # Recomendar instrumentos baseado na análise
            if analysis.technical_difficulty < 0.3:
                analysis.recommended_instruments = ['Piano', 'Flauta', 'Violino']
            elif analysis.technical_difficulty < 0.6:
                analysis.recommended_instruments = ['Piano', 'Violino', 'Guitarra', 'Saxofone']
            else:
                analysis.recommended_instruments = ['Piano', 'Violino', 'Guitarra', 'Saxofone', 'Trompete']
            
            # Determinar dificuldade
            if analysis.technical_difficulty < 0.3:
                analysis.difficulty = "beginner"
            elif analysis.technical_difficulty < 0.6:
                analysis.difficulty = "intermediate"
            else:
                analysis.difficulty = "advanced"
            
            # Limpar arquivo temporário
            os.unlink(temp_file.name)
            
            return {
                "title": analysis.title,
                "composer": analysis.composer,
                "instrument": analysis.instrument,
                "key": analysis.key,
                "time_signature": analysis.time_signature,
                "tempo": analysis.tempo,
                "difficulty": analysis.difficulty,
                "notes": analysis.notes,
                "measures": analysis.measures,
                "chords": list(set(analysis.chords)),
                "scales": list(set(analysis.scales)),
                "melody_contour": analysis.melody_contour,
                "rhythm_complexity": float(analysis.rhythm_complexity),
                "harmonic_complexity": float(analysis.harmonic_complexity),
                "technical_difficulty": float(analysis.technical_difficulty),
                "expression_markers": analysis.expression_markers,
                "dynamics": list(set(analysis.dynamics)),
                "articulations": list(set(analysis.articulations)),
                "recommended_instruments": analysis.recommended_instruments
            }
            
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/profile")
async def delete_profile(request: Request):
    # Supondo que o usuário está autenticado via header Authorization: Bearer <token>
    # e que o id do usuário está disponível no header ou via JWT (ajuste conforme sua autenticação)
    user_id = request.headers.get("x-user-id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Usuário não autenticado")

    # Deleta o perfil e o usuário (ON DELETE CASCADE cuida do resto)
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    supabase.table("profiles").delete().eq("id", user_id).execute()
    resp = supabase.table("users").delete().eq("id", user_id).execute()
    if hasattr(resp, 'error') and resp.error:
        raise HTTPException(status_code=400, detail=resp.error.message)
    return {"ok": True}

app.include_router(sheets_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 