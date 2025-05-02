-- Tabela para rate limiting (independente, pode ser criada primeiro)
CREATE TABLE public.rate_limits (
    id bigint primary key generated always as identity,
    user_id uuid references auth.users(id) on delete cascade,
    action_type text not null,
    count integer default 1,
    first_action_at timestamp with time zone default now(),
    last_action_at timestamp with time zone default now(),
    UNIQUE(user_id, action_type)
);

-- Tabela para playlists/coleções
CREATE TABLE public.playlists (
    id bigint primary key generated always as identity,
    user_id uuid references auth.users(id) on delete cascade,
    title text not null,
    description text,
    is_public boolean default true,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Tabela para itens da playlist (depende de playlists e music_sheets)
CREATE TABLE public.playlist_items (
    id bigint primary key generated always as identity,
    playlist_id bigint references public.playlists(id) on delete cascade,
    sheet_id uuid references public.music_sheets(id) on delete cascade,
    position integer not null,
    created_at timestamp with time zone default now(),
    UNIQUE(playlist_id, sheet_id)
);

-- Tabela para denúncias (depende de users, music_sheets e comments)
CREATE TABLE public.reports (
    id bigint primary key generated always as identity,
    reporter_id uuid references auth.users(id) on delete cascade,
    reported_user_id uuid references auth.users(id) on delete cascade,
    sheet_id uuid references public.music_sheets(id) on delete cascade,
    comment_id uuid references public.comments(id) on delete cascade,
    type text not null check (type in ('inappropriate_content', 'copyright', 'spam', 'harassment', 'other')),
    description text,
    status text not null default 'pending' check (status in ('pending', 'reviewing', 'resolved', 'rejected')),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    resolved_at timestamp with time zone,
    resolved_by uuid references auth.users(id) on delete set null
);

-- Adicionar RLS e políticas para rate_limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits" ON rate_limits
FOR SELECT USING (user_id = auth.uid());

-- Adicionar RLS e políticas para playlists
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Can view public playlists" ON playlists
FOR SELECT USING (is_public OR user_id = auth.uid());

CREATE POLICY "Can create playlists" ON playlists
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Can update own playlists" ON playlists
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Can delete own playlists" ON playlists
FOR DELETE USING (user_id = auth.uid());

-- Adicionar RLS e políticas para playlist_items
ALTER TABLE playlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Can view playlist items" ON playlist_items
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM playlists p 
        WHERE p.id = playlist_id 
        AND (p.is_public OR p.user_id = auth.uid())
    )
);

CREATE POLICY "Can manage playlist items" ON playlist_items
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM playlists p 
        WHERE p.id = playlist_id 
        AND p.user_id = auth.uid()
    )
);

-- Adicionar RLS e políticas para reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Can create reports" ON reports
FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins can view reports" ON reports
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = auth.uid() 
        AND u.is_admin = true
    )
);

CREATE POLICY "Users can view own reports" ON reports
FOR SELECT USING (reporter_id = auth.uid());

-- Índices adicionais para melhor performance
CREATE INDEX idx_playlists_user_id ON playlists(user_id);
CREATE INDEX idx_playlist_items_playlist_id ON playlist_items(playlist_id);
CREATE INDEX idx_playlist_items_sheet_id ON playlist_items(sheet_id);
CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_reported_user_id ON reports(reported_user_id);
CREATE INDEX idx_reports_sheet_id ON reports(sheet_id);
CREATE INDEX idx_reports_comment_id ON reports(comment_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_rate_limits_user_action ON rate_limits(user_id, action_type);
CREATE INDEX idx_rate_limits_last_action ON rate_limits(last_action_at);

-- Triggers para atualizar timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_playlists_updated_at
    BEFORE UPDATE ON playlists
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Trigger para manter a ordem dos itens na playlist
CREATE OR REPLACE FUNCTION update_playlist_positions()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- Atualizar posições após deleção
        UPDATE playlist_items
        SET position = position - 1
        WHERE playlist_id = OLD.playlist_id
        AND position > OLD.position;
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        -- Ajustar posições para nova inserção
        UPDATE playlist_items
        SET position = position + 1
        WHERE playlist_id = NEW.playlist_id
        AND position >= NEW.position;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintain_playlist_order
    BEFORE INSERT OR DELETE ON playlist_items
    FOR EACH ROW
    EXECUTE PROCEDURE update_playlist_positions();

-- Trigger para limpar notificações antigas (manter apenas últimos 30 dias)
CREATE OR REPLACE FUNCTION clean_old_notifications()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM notifications
    WHERE created_at < now() - INTERVAL '30 days'
    AND read = true;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_notifications
    AFTER INSERT ON notifications
    FOR EACH STATEMENT
    EXECUTE PROCEDURE clean_old_notifications();

-- Trigger para limitar rate de ações
CREATE OR REPLACE FUNCTION check_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    max_actions integer;
    time_window interval;
    current_count integer;
BEGIN
    -- Definir limites por tipo de ação
    CASE TG_ARGV[0]
        WHEN 'comment' THEN
            max_actions := 10;
            time_window := interval '1 minute';
        WHEN 'like' THEN
            max_actions := 30;
            time_window := interval '1 minute';
        WHEN 'report' THEN
            max_actions := 5;
            time_window := interval '1 hour';
        ELSE
            max_actions := 20;
            time_window := interval '1 minute';
    END CASE;

    -- Verificar e atualizar contagem
    WITH rate_limit_check AS (
        INSERT INTO rate_limits (user_id, action_type, count, first_action_at, last_action_at)
        VALUES (auth.uid(), TG_ARGV[0], 1, now(), now())
        ON CONFLICT (user_id, action_type) DO UPDATE
        SET count = CASE
            WHEN rate_limits.first_action_at < now() - time_window THEN 1
            ELSE rate_limits.count + 1
            END,
            first_action_at = CASE
            WHEN rate_limits.first_action_at < now() - time_window THEN now()
            ELSE rate_limits.first_action_at
            END,
            last_action_at = now()
        RETURNING count
    )
    SELECT count INTO current_count FROM rate_limit_check;

    IF current_count > max_actions THEN
        RAISE EXCEPTION 'Rate limit exceeded for %', TG_ARGV[0];
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar rate limiting para diferentes ações
CREATE TRIGGER check_comment_rate_limit
    BEFORE INSERT ON comments
    FOR EACH ROW
    EXECUTE PROCEDURE check_rate_limit('comment');

CREATE TRIGGER check_like_rate_limit
    BEFORE INSERT ON likes
    FOR EACH ROW
    EXECUTE PROCEDURE check_rate_limit('like');

CREATE TRIGGER check_report_rate_limit
    BEFORE INSERT ON reports
    FOR EACH ROW
    EXECUTE PROCEDURE check_rate_limit('report'); 