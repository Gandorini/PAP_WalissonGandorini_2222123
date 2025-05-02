-- Atualizações na tabela users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS banned_until timestamp with time zone,
ADD COLUMN IF NOT EXISTS login_attempts integer DEFAULT 0;

-- Atualizações na tabela music_sheets
ALTER TABLE music_sheets
ADD COLUMN IF NOT EXISTS views_count bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS downloads_count bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS privacy_level text DEFAULT 'public' 
    CHECK (privacy_level IN ('public', 'unlisted', 'private', 'followers_only')),
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_viewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Criar tabela para visualizações (para analytics e recomendações)
CREATE TABLE IF NOT EXISTS sheet_views (
    id bigint primary key generated always as identity,
    sheet_id bigint references public.music_sheets(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    viewed_at timestamp with time zone default now(),
    view_duration integer, -- em segundos
    UNIQUE(sheet_id, user_id, viewed_at)
);

-- Criar tabela para downloads
CREATE TABLE IF NOT EXISTS sheet_downloads (
    id bigint primary key generated always as identity,
    sheet_id bigint references public.music_sheets(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    downloaded_at timestamp with time zone default now(),
    UNIQUE(sheet_id, user_id, downloaded_at)
);

-- Criar tabela para histórico de moderação
CREATE TABLE IF NOT EXISTS moderation_logs (
    id bigint primary key generated always as identity,
    admin_id uuid references auth.users(id) on delete set null,
    action_type text not null,
    target_type text not null,
    target_id text not null,
    description text,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone default now()
);

-- Adicionar RLS para novas tabelas
ALTER TABLE sheet_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para sheet_views
CREATE POLICY "Users can view own views" ON sheet_views
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Sheet owners can view their sheet views" ON sheet_views
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM music_sheets ms 
        WHERE ms.id = sheet_id 
        AND ms.user_id = auth.uid()
    )
);

-- Políticas para sheet_downloads
CREATE POLICY "Users can view own downloads" ON sheet_downloads
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Sheet owners can view their sheet downloads" ON sheet_downloads
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM music_sheets ms 
        WHERE ms.id = sheet_id 
        AND ms.user_id = auth.uid()
    )
);

-- Políticas para moderation_logs
CREATE POLICY "Admins can view moderation logs" ON moderation_logs
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = auth.uid() 
        AND u.is_admin = true
    )
);

-- Índices para as novas tabelas
CREATE INDEX idx_sheet_views_sheet_id ON sheet_views(sheet_id);
CREATE INDEX idx_sheet_views_user_id ON sheet_views(user_id);
CREATE INDEX idx_sheet_views_viewed_at ON sheet_views(viewed_at DESC);

CREATE INDEX idx_sheet_downloads_sheet_id ON sheet_downloads(sheet_id);
CREATE INDEX idx_sheet_downloads_user_id ON sheet_downloads(user_id);
CREATE INDEX idx_sheet_downloads_downloaded_at ON sheet_downloads(downloaded_at DESC);

CREATE INDEX idx_moderation_logs_admin_id ON moderation_logs(admin_id);
CREATE INDEX idx_moderation_logs_action_type ON moderation_logs(action_type);
CREATE INDEX idx_moderation_logs_target_type_id ON moderation_logs(target_type, target_id);
CREATE INDEX idx_moderation_logs_created_at ON moderation_logs(created_at DESC);

-- Triggers para contagem automática
CREATE OR REPLACE FUNCTION update_sheet_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'sheet_views' THEN
            UPDATE music_sheets 
            SET views_count = views_count + 1,
                last_viewed_at = NEW.viewed_at
            WHERE id = NEW.sheet_id;
        ELSIF TG_TABLE_NAME = 'sheet_downloads' THEN
            UPDATE music_sheets 
            SET downloads_count = downloads_count + 1
            WHERE id = NEW.sheet_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_views_count
    AFTER INSERT ON sheet_views
    FOR EACH ROW
    EXECUTE PROCEDURE update_sheet_counts();

CREATE TRIGGER update_downloads_count
    AFTER INSERT ON sheet_downloads
    FOR EACH ROW
    EXECUTE PROCEDURE update_sheet_counts(); 