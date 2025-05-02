-- Função para registrar visualização de partitura
CREATE OR REPLACE FUNCTION record_sheet_view(
  p_sheet_id bigint,
  p_view_duration integer DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO sheet_views (sheet_id, user_id, view_duration)
  VALUES (p_sheet_id, auth.uid(), p_view_duration);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para registrar download de partitura
CREATE OR REPLACE FUNCTION record_sheet_download(
  p_sheet_id bigint
) RETURNS void AS $$
BEGIN
  INSERT INTO sheet_downloads (sheet_id, user_id)
  VALUES (p_sheet_id, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar configurações do usuário
CREATE OR REPLACE FUNCTION update_user_settings(
  p_settings jsonb
) RETURNS void AS $$
BEGIN
  UPDATE users
  SET settings = settings || p_settings
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar email do usuário
CREATE OR REPLACE FUNCTION verify_user_email(
  p_user_id uuid
) RETURNS void AS $$
BEGIN
  -- Verificar se é admin ou o próprio usuário
  IF NOT (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND is_admin = true
    ) OR auth.uid() = p_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE users
  SET email_verified = true
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para banir usuário (apenas admin)
CREATE OR REPLACE FUNCTION ban_user(
  p_user_id uuid,
  p_ban_duration interval,
  p_reason text
) RETURNS void AS $$
BEGIN
  -- Verificar se é admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Banir usuário
  UPDATE users
  SET banned_until = now() + p_ban_duration
  WHERE id = p_user_id;

  -- Registrar ação de moderação
  INSERT INTO moderation_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    description,
    metadata
  )
  VALUES (
    auth.uid(),
    'ban_user',
    'user',
    p_user_id::text,
    p_reason,
    jsonb_build_object(
      'ban_duration', p_ban_duration,
      'ban_end', (now() + p_ban_duration)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas de uma partitura
CREATE OR REPLACE FUNCTION get_sheet_detailed_stats(
  p_sheet_id bigint
) RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'views', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'unique_users', COUNT(DISTINCT user_id),
        'last_24h', COUNT(*) FILTER (WHERE viewed_at > now() - interval '24 hours'),
        'avg_duration', AVG(view_duration)
      )
      FROM sheet_views
      WHERE sheet_id = p_sheet_id
    ),
    'downloads', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'unique_users', COUNT(DISTINCT user_id),
        'last_24h', COUNT(*) FILTER (WHERE downloaded_at > now() - interval '24 hours')
      )
      FROM sheet_downloads
      WHERE sheet_id = p_sheet_id
    ),
    'engagement', (
      SELECT jsonb_build_object(
        'likes', COUNT(*),
        'comments', (SELECT COUNT(*) FROM comments WHERE sheet_id = p_sheet_id),
        'favorites', (SELECT COUNT(*) FROM favorites WHERE sheet_id = p_sheet_id),
        'ratings', jsonb_build_object(
          'count', COUNT(*),
          'average', COALESCE(AVG(rating)::numeric(10,2), 0),
          'distribution', jsonb_object_agg(
            rating::text,
            COUNT(*)
          )
        )
      )
      FROM ratings
      WHERE sheet_id = p_sheet_id
      GROUP BY sheet_id
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter recomendações de partituras
CREATE OR REPLACE FUNCTION get_sheet_recommendations(
  limit_count integer DEFAULT 10
) RETURNS TABLE (
  sheet_id bigint,
  title text,
  composer text,
  file_url text,
  user_id uuid,
  username text,
  similarity_score numeric
) AS $$
BEGIN
  -- Baseado nas visualizações e interações do usuário
  RETURN QUERY
  WITH user_interests AS (
    -- Partituras que o usuário visualizou
    SELECT DISTINCT ms.id as sheet_id
    FROM sheet_views sv
    JOIN music_sheets ms ON ms.id = sv.sheet_id
    WHERE sv.user_id = auth.uid()
    UNION
    -- Partituras que o usuário curtiu
    SELECT DISTINCT sheet_id
    FROM likes
    WHERE user_id = auth.uid()
    UNION
    -- Partituras que o usuário favoritou
    SELECT DISTINCT sheet_id
    FROM favorites
    WHERE user_id = auth.uid()
  ),
  similar_sheets AS (
    SELECT 
      ms.id,
      ms.title,
      ms.composer,
      ms.file_url,
      u.id as user_id,
      u.username,
      COUNT(DISTINCT ui.sheet_id) as similarity_score
    FROM music_sheets ms
    JOIN users u ON u.id = ms.user_id
    LEFT JOIN user_interests ui ON (
      ms.composer = (SELECT composer FROM music_sheets WHERE id = ui.sheet_id) OR
      ms.tags && (SELECT tags FROM music_sheets WHERE id = ui.sheet_id)
    )
    WHERE ms.privacy_level = 'public'
    AND ms.id NOT IN (SELECT sheet_id FROM user_interests)
    GROUP BY ms.id, ms.title, ms.composer, ms.file_url, u.id, u.username
    HAVING COUNT(DISTINCT ui.sheet_id) > 0
  )
  SELECT *
  FROM similar_sheets
  ORDER BY similarity_score DESC, created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter tendências (trending)
CREATE OR REPLACE FUNCTION get_trending_sheets(
  time_window interval DEFAULT interval '7 days',
  limit_count integer DEFAULT 10
) RETURNS TABLE (
  sheet_id bigint,
  title text,
  composer text,
  file_url text,
  user_id uuid,
  username text,
  trend_score numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_activity AS (
    SELECT 
      ms.id,
      ms.title,
      ms.composer,
      ms.file_url,
      u.id as user_id,
      u.username,
      (
        COUNT(DISTINCT sv.id) * 1.0 + -- visualizações
        COUNT(DISTINCT sd.id) * 2.0 + -- downloads
        COUNT(DISTINCT l.id) * 3.0 + -- likes
        COUNT(DISTINCT c.id) * 4.0 + -- comentários
        COUNT(DISTINCT f.id) * 5.0 -- favoritos
      ) as trend_score
    FROM music_sheets ms
    JOIN users u ON u.id = ms.user_id
    LEFT JOIN sheet_views sv ON sv.sheet_id = ms.id 
      AND sv.viewed_at > now() - time_window
    LEFT JOIN sheet_downloads sd ON sd.sheet_id = ms.id 
      AND sd.downloaded_at > now() - time_window
    LEFT JOIN likes l ON l.sheet_id = ms.id 
      AND l.created_at > now() - time_window
    LEFT JOIN comments c ON c.sheet_id = ms.id 
      AND c.created_at > now() - time_window
    LEFT JOIN favorites f ON f.sheet_id = ms.id 
      AND f.created_at > now() - time_window
    WHERE ms.privacy_level = 'public'
    GROUP BY ms.id, ms.title, ms.composer, ms.file_url, u.id, u.username
    HAVING COUNT(DISTINCT sv.id) + 
           COUNT(DISTINCT sd.id) + 
           COUNT(DISTINCT l.id) + 
           COUNT(DISTINCT c.id) + 
           COUNT(DISTINCT f.id) > 0
  )
  SELECT *
  FROM recent_activity
  ORDER BY trend_score DESC, title
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 