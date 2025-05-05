from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

# Modelos Pydantic
class MusicSheetIn(BaseModel):
    title: str
    composer: str
    instrument: str
    difficulty: str
    tags: Optional[List[str]] = []
    file_url: str
    midi_url: Optional[str] = None
    user_id: str
    scales: Optional[List[str]] = []

class MusicSheetOut(MusicSheetIn):
    id: int

# Simulação de banco de dados em memória
_db: List[dict] = []

@router.post('/music-sheets/', response_model=MusicSheetOut)
def create_sheet(sheet: MusicSheetIn):
    new_id = len(_db) + 1
    data = sheet.dict()
    data['id'] = new_id
    _db.append(data)
    return data

@router.get('/music-sheets/', response_model=List[MusicSheetOut])
def list_sheets():
    return _db

@router.get('/music-sheets/{sheet_id}', response_model=MusicSheetOut)
def get_sheet(sheet_id: int):
    for sheet in _db:
        if sheet['id'] == sheet_id:
            return sheet
    raise HTTPException(status_code=404, detail='Sheet not found')

@router.put('/music-sheets/{sheet_id}', response_model=MusicSheetOut)
def update_sheet(sheet_id: int, sheet: MusicSheetIn):
    for idx, s in enumerate(_db):
        if s['id'] == sheet_id:
            updated = sheet.dict()
            updated['id'] = sheet_id
            _db[idx] = updated
            return updated
    raise HTTPException(status_code=404, detail='Sheet not found')

@router.delete('/music-sheets/{sheet_id}')
def delete_sheet(sheet_id: int):
    for idx, s in enumerate(_db):
        if s['id'] == sheet_id:
            _db.pop(idx)
            return {'ok': True}
    raise HTTPException(status_code=404, detail='Sheet not found') 