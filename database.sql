-- Tabela de avaliações (ratings) que ainda não existe
CREATE TABLE public.ratings (
    id bigint primary key generated always as identity,
    user_id uuid references auth.users(id) on delete cascade,
    sheet_id bigint references public.music_sheets(id) on delete cascade,
    rating integer check (rating >= 1 and rating <= 5),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    UNIQUE(user_id, sheet_id)
);

-- Tabela de favoritos que ainda não existe
CREATE TABLE public.favorites (
    id bigint primary key generated always as identity,
    user_id uuid references auth.users(id) on delete cascade,
    sheet_id bigint references public.music_sheets(id) on delete cascade,
    created_at timestamp with time zone default now(),
    UNIQUE(user_id, sheet_id)
);

-- Adicionar RLS e políticas para ratings
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Can read ratings" ON ratings
FOR SELECT USING (true);

CREATE POLICY "Can create ratings" ON ratings
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Can update own ratings" ON ratings
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Can delete own ratings" ON ratings
FOR DELETE USING (user_id = auth.uid());

-- Adicionar RLS e políticas para favorites
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Can read favorites" ON favorites
FOR SELECT USING (true);

CREATE POLICY "Can create favorites" ON favorites
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Can delete own favorites" ON favorites
FOR DELETE USING (user_id = auth.uid());

-- Índices para melhor performance
CREATE INDEX idx_ratings_sheet_id ON ratings(sheet_id);
CREATE INDEX idx_ratings_user_id ON ratings(user_id);
CREATE INDEX idx_favorites_sheet_id ON favorites(sheet_id);
CREATE INDEX idx_favorites_user_id ON favorites(user_id); 