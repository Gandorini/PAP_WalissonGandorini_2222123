-- Índices compostos para consultas de feed e listagens
CREATE INDEX idx_music_sheets_user_created ON music_sheets(user_id, created_at DESC);
CREATE INDEX idx_music_sheets_public_created ON music_sheets(is_public, created_at DESC);

-- Índices para buscas por título e compositor
CREATE INDEX idx_music_sheets_title_trgm ON music_sheets USING gin(title gin_trgm_ops);
CREATE INDEX idx_music_sheets_composer_trgm ON music_sheets USING gin(composer gin_trgm_ops);

-- Índices para contagens e agregações
CREATE INDEX idx_likes_sheet_created ON likes(sheet_id, created_at DESC);
CREATE INDEX idx_comments_sheet_created ON comments(sheet_id, created_at DESC);
CREATE INDEX idx_ratings_sheet_rating ON ratings(sheet_id, rating);

-- Índices para notificações
CREATE INDEX idx_notifications_user_read_created ON notifications(user_id, read, created_at DESC);

-- Índices para seguidores
CREATE INDEX idx_followers_following_created ON followers(following_id, created_at DESC);
CREATE INDEX idx_followers_follower_created ON followers(follower_id, created_at DESC);

-- Índices para denúncias
CREATE INDEX idx_reports_status_created ON reports(status, created_at DESC);

-- Extensão para busca textual melhorada
CREATE EXTENSION IF NOT EXISTS pg_trgm; 