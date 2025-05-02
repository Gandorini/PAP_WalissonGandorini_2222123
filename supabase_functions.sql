-- Função para criar uma playlist
CREATE OR REPLACE FUNCTION create_playlist(
  p_title text,
  p_description text DEFAULT NULL,
  p_is_public boolean DEFAULT true
) RETURNS bigint AS $$
DECLARE
  new_playlist_id bigint;
BEGIN
  INSERT INTO playlists (user_id, title, description, is_public)
  VALUES (auth.uid(), p_title, p_description, p_is_public)
  RETURNING id INTO new_playlist_id;
  
  RETURN new_playlist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para adicionar partitura à playlist
CREATE OR REPLACE FUNCTION add_to_playlist(
  p_playlist_id bigint,
  p_sheet_id bigint
) RETURNS void AS $$
DECLARE
  next_position integer;
BEGIN
  -- Verificar se o usuário é dono da playlist
  IF NOT EXISTS (
    SELECT 1 FROM playlists 
    WHERE id = p_playlist_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Obter próxima posição
  SELECT COALESCE(MAX(position), 0) + 1
  INTO next_position
  FROM playlist_items
  WHERE playlist_id = p_playlist_id;

  -- Inserir item
  INSERT INTO playlist_items (playlist_id, sheet_id, position)
  VALUES (p_playlist_id, p_sheet_id, next_position);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para remover partitura da playlist
CREATE OR REPLACE FUNCTION remove_from_playlist(
  p_playlist_id bigint,
  p_sheet_id bigint
) RETURNS void AS $$
BEGIN
  -- Verificar se o usuário é dono da playlist
  IF NOT EXISTS (
    SELECT 1 FROM playlists 
    WHERE id = p_playlist_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM playlist_items
  WHERE playlist_id = p_playlist_id
  AND sheet_id = p_sheet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para reordenar itens da playlist
CREATE OR REPLACE FUNCTION reorder_playlist_items(
  p_playlist_id bigint,
  p_sheet_id bigint,
  p_new_position integer
) RETURNS void AS $$
DECLARE
  current_position integer;
BEGIN
  -- Verificar se o usuário é dono da playlist
  IF NOT EXISTS (
    SELECT 1 FROM playlists 
    WHERE id = p_playlist_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Obter posição atual
  SELECT position INTO current_position
  FROM playlist_items
  WHERE playlist_id = p_playlist_id
  AND sheet_id = p_sheet_id;

  IF current_position IS NULL THEN
    RAISE EXCEPTION 'Item not found in playlist';
  END IF;

  -- Atualizar posições
  IF p_new_position > current_position THEN
    UPDATE playlist_items
    SET position = position - 1
    WHERE playlist_id = p_playlist_id
    AND position > current_position
    AND position <= p_new_position;
  ELSE
    UPDATE playlist_items
    SET position = position + 1
    WHERE playlist_id = p_playlist_id
    AND position >= p_new_position
    AND position < current_position;
  END IF;

  -- Atualizar posição do item
  UPDATE playlist_items
  SET position = p_new_position
  WHERE playlist_id = p_playlist_id
  AND sheet_id = p_sheet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar denúncia
CREATE OR REPLACE FUNCTION create_report(
  p_reported_user_id uuid DEFAULT NULL,
  p_sheet_id bigint DEFAULT NULL,
  p_comment_id bigint DEFAULT NULL,
  p_type text,
  p_description text
) RETURNS bigint AS $$
DECLARE
  new_report_id bigint;
BEGIN
  -- Validar tipo de denúncia
  IF p_type NOT IN ('inappropriate_content', 'copyright', 'spam', 'harassment', 'other') THEN
    RAISE EXCEPTION 'Invalid report type';
  END IF;

  -- Validar que pelo menos um alvo foi especificado
  IF p_reported_user_id IS NULL AND p_sheet_id IS NULL AND p_comment_id IS NULL THEN
    RAISE EXCEPTION 'Must specify at least one report target';
  END IF;

  INSERT INTO reports (
    reporter_id,
    reported_user_id,
    sheet_id,
    comment_id,
    type,
    description
  )
  VALUES (
    auth.uid(),
    p_reported_user_id,
    p_sheet_id,
    p_comment_id,
    p_type,
    p_description
  )
  RETURNING id INTO new_report_id;

  RETURN new_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para resolver denúncia (apenas admin)
CREATE OR REPLACE FUNCTION resolve_report(
  p_report_id bigint,
  p_status text,
  p_admin_notes text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Verificar se o usuário é admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Validar status
  IF p_status NOT IN ('resolved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE reports
  SET status = p_status,
      resolved_at = now(),
      resolved_by = auth.uid(),
      description = CASE 
        WHEN p_admin_notes IS NOT NULL 
        THEN description || E'\n\nAdmin Notes: ' || p_admin_notes
        ELSE description
      END
  WHERE id = p_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter playlists do usuário
CREATE OR REPLACE FUNCTION get_user_playlists(
  p_user_id uuid DEFAULT NULL,
  limit_count integer DEFAULT 10,
  offset_count integer DEFAULT 0
) RETURNS TABLE (
  playlist_id bigint,
  title text,
  description text,
  is_public boolean,
  created_at timestamptz,
  updated_at timestamptz,
  item_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as playlist_id,
    p.title,
    p.description,
    p.is_public,
    p.created_at,
    p.updated_at,
    COUNT(pi.id)::bigint as item_count
  FROM playlists p
  LEFT JOIN playlist_items pi ON pi.playlist_id = p.id
  WHERE (p_user_id IS NULL AND p.user_id = auth.uid())
    OR (p_user_id IS NOT NULL AND p.user_id = p_user_id AND (p.is_public OR p.user_id = auth.uid()))
  GROUP BY p.id
  ORDER BY p.updated_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter conteúdo de uma playlist
CREATE OR REPLACE FUNCTION get_playlist_contents(
  p_playlist_id bigint,
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
) RETURNS TABLE (
  sheet_id bigint,
  position integer,
  title text,
  composer text,
  file_url text,
  user_id uuid,
  username text,
  added_at timestamptz
) AS $$
BEGIN
  -- Verificar se o usuário pode ver esta playlist
  IF NOT EXISTS (
    SELECT 1 FROM playlists
    WHERE id = p_playlist_id
    AND (is_public OR user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT 
    ms.id as sheet_id,
    pi.position,
    ms.title,
    ms.composer,
    ms.file_url,
    u.id as user_id,
    u.username,
    pi.created_at as added_at
  FROM playlist_items pi
  JOIN music_sheets ms ON ms.id = pi.sheet_id
  JOIN users u ON u.id = ms.user_id
  WHERE pi.playlist_id = p_playlist_id
  ORDER BY pi.position
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 