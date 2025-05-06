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
from PyPDF2 import PdfReader
from PIL import Image
import pytesseract

app = FastAPI()

# Configurar CORS (deve ser antes de tudo)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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