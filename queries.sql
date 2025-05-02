-- Função para obter feed de partituras dos usuários que sigo
CREATE OR REPLACE FUNCTION get_following_feed(
  limit_count integer DEFAULT 10,
  offset_count integer DEFAULT 0
) RETURNS TABLE (
  sheet_id bigint,
  title text,
  composer text,
  file_url text,
  created_at timestamptz,
  user_id uuid,
  username text,
  avatar_url text,
  likes_count bigint,
  comments_count bigint,
  average_rating numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ms.id as sheet_id,
    ms.title,
    ms.composer,
    ms.file_url,
    ms.created_at,
    u.id as user_id,
    u.username,
    u.avatar_url,
    (SELECT count(*) FROM likes l WHERE l.sheet_id = ms.id) as likes_count,
    (SELECT count(*) FROM comments c WHERE c.sheet_id = ms.id) as comments_count,
    COALESCE((SELECT avg(rating)::numeric(10,2) FROM ratings r WHERE r.sheet_id = ms.id), 0) as average_rating
  FROM music_sheets ms
  JOIN users u ON u.id = ms.user_id
  WHERE ms.user_id IN (
    SELECT following_id 
    FROM followers 
    WHERE follower_id = auth.uid()
  )
  ORDER BY ms.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter notificações não lidas
CREATE OR REPLACE FUNCTION get_unread_notifications(
  limit_count integer DEFAULT 10
) RETURNS TABLE (
  id bigint,
  type text,
  content text,
  created_at timestamptz,
  related_user_id uuid,
  related_username text,
  related_avatar_url text,
  sheet_id bigint,
  sheet_title text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.type,
    n.content,
    n.created_at,
    n.related_user_id,
    u.username as related_username,
    u.avatar_url as related_avatar_url,
    n.sheet_id,
    ms.title as sheet_title
  FROM notifications n
  LEFT JOIN users u ON u.id = n.related_user_id
  LEFT JOIN music_sheets ms ON ms.id = n.sheet_id
  WHERE n.user_id = auth.uid()
  AND n.read = false
  ORDER BY n.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter sugestões de usuários para seguir
CREATE OR REPLACE FUNCTION get_user_suggestions(
  limit_count integer DEFAULT 5
) RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  followers_count bigint,
  sheets_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.username,
    u.avatar_url,
    (SELECT count(*) FROM followers f WHERE f.following_id = u.id) as followers_count,
    (SELECT count(*) FROM music_sheets ms WHERE ms.user_id = u.id) as sheets_count
  FROM users u
  WHERE u.id != auth.uid()
  AND u.id NOT IN (
    SELECT following_id 
    FROM followers 
    WHERE follower_id = auth.uid()
  )
  ORDER BY followers_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter comentários de uma partitura
CREATE OR REPLACE FUNCTION get_sheet_comments(
  p_sheet_id bigint,
  limit_count integer DEFAULT 10,
  offset_count integer DEFAULT 0
) RETURNS TABLE (
  comment_id bigint,
  content text,
  created_at timestamptz,
  user_id uuid,
  username text,
  avatar_url text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as comment_id,
    c.content,
    c.created_at,
    u.id as user_id,
    u.username,
    u.avatar_url
  FROM comments c
  JOIN users u ON u.id = c.user_id
  WHERE c.sheet_id = p_sheet_id
  ORDER BY c.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar status de interação com uma partitura
CREATE OR REPLACE FUNCTION get_user_sheet_interaction(
  p_sheet_id bigint
) RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'has_liked', EXISTS(SELECT 1 FROM likes WHERE sheet_id = p_sheet_id AND user_id = auth.uid()),
    'has_favorited', EXISTS(SELECT 1 FROM favorites WHERE sheet_id = p_sheet_id AND user_id = auth.uid()),
    'user_rating', (SELECT rating FROM ratings WHERE sheet_id = p_sheet_id AND user_id = auth.uid())
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 