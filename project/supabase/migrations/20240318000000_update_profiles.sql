-- Adiciona novos campos à tabela profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_sign_in timestamptz,
ADD COLUMN IF NOT EXISTS last_sign_out timestamptz,
ADD COLUMN IF NOT EXISTS last_activity timestamptz,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS login_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{"theme": "light", "notifications": true, "language": "pt-BR"}'::jsonb;

-- Adiciona índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity ON profiles(last_activity);

-- Função para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para limpar sessões antigas
CREATE OR REPLACE FUNCTION clean_inactive_sessions()
RETURNS void AS $$
BEGIN
    UPDATE profiles
    SET is_active = false
    WHERE last_activity < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Agendar limpeza de sessões antigas (executar a cada 6 horas)
SELECT cron.schedule(
    'clean-inactive-sessions',
    '0 */6 * * *',
    'SELECT clean_inactive_sessions();'
); 