-- Função para seguir um usuário
CREATE OR REPLACE FUNCTION follow_user(
  target_user_id uuid
) RETURNS void AS $$
BEGIN
  -- Inserir o relacionamento de seguidor
  INSERT INTO followers (follower_id, following_id)
  VALUES (auth.uid(), target_user_id);
  
  -- Criar notificação para o usuário que foi seguido
  INSERT INTO notifications (user_id, type, content, related_user_id)
  VALUES (
    target_user_id,
    'follow',
    'começou a te seguir',
    auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para deixar de seguir um usuário
CREATE OR REPLACE FUNCTION unfollow_user(
  target_user_id uuid
) RETURNS void AS $$
BEGIN
  DELETE FROM followers
  WHERE follower_id = auth.uid()
  AND following_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para dar like em uma partitura
CREATE OR REPLACE FUNCTION like_sheet(
  sheet_id bigint
) RETURNS void AS $$
DECLARE
  sheet_owner_id uuid;
BEGIN
  -- Obter o dono da partitura
  SELECT user_id INTO sheet_owner_id
  FROM music_sheets
  WHERE id = sheet_id;

  -- Inserir o like
  INSERT INTO likes (user_id, sheet_id)
  VALUES (auth.uid(), sheet_id);
  
  -- Criar notificação para o dono da partitura
  INSERT INTO notifications (user_id, type, content, related_user_id, sheet_id)
  VALUES (
    sheet_owner_id,
    'like',
    'curtiu sua partitura',
    auth.uid(),
    sheet_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para remover like de uma partitura
CREATE OR REPLACE FUNCTION unlike_sheet(
  sheet_id bigint
) RETURNS void AS $$
BEGIN
  DELETE FROM likes
  WHERE user_id = auth.uid()
  AND sheet_id = sheet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para adicionar comentário em uma partitura
CREATE OR REPLACE FUNCTION add_comment(
  sheet_id bigint,
  comment_text text
) RETURNS void AS $$
DECLARE
  sheet_owner_id uuid;
BEGIN
  -- Obter o dono da partitura
  SELECT user_id INTO sheet_owner_id
  FROM music_sheets
  WHERE id = sheet_id;

  -- Inserir o comentário
  INSERT INTO comments (user_id, sheet_id, content)
  VALUES (auth.uid(), sheet_id, comment_text);
  
  -- Criar notificação para o dono da partitura
  INSERT INTO notifications (user_id, type, content, related_user_id, sheet_id)
  VALUES (
    sheet_owner_id,
    'comment',
    'comentou em sua partitura',
    auth.uid(),
    sheet_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para avaliar uma partitura
CREATE OR REPLACE FUNCTION rate_sheet(
  sheet_id bigint,
  rating_value integer
) RETURNS void AS $$
DECLARE
  sheet_owner_id uuid;
BEGIN
  -- Validar rating
  IF rating_value < 1 OR rating_value > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  -- Obter o dono da partitura
  SELECT user_id INTO sheet_owner_id
  FROM music_sheets
  WHERE id = sheet_id;

  -- Inserir ou atualizar avaliação
  INSERT INTO ratings (user_id, sheet_id, rating)
  VALUES (auth.uid(), sheet_id, rating_value)
  ON CONFLICT (user_id, sheet_id)
  DO UPDATE SET rating = rating_value, updated_at = now();
  
  -- Criar notificação para o dono da partitura
  INSERT INTO notifications (user_id, type, content, related_user_id, sheet_id)
  VALUES (
    sheet_owner_id,
    'rating',
    'avaliou sua partitura',
    auth.uid(),
    sheet_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para favoritar uma partitura
CREATE OR REPLACE FUNCTION favorite_sheet(
  sheet_id bigint
) RETURNS void AS $$
DECLARE
  sheet_owner_id uuid;
BEGIN
  -- Obter o dono da partitura
  SELECT user_id INTO sheet_owner_id
  FROM music_sheets
  WHERE id = sheet_id;

  -- Inserir favorito
  INSERT INTO favorites (user_id, sheet_id)
  VALUES (auth.uid(), sheet_id);
  
  -- Criar notificação para o dono da partitura
  INSERT INTO notifications (user_id, type, content, related_user_id, sheet_id)
  VALUES (
    sheet_owner_id,
    'favorite',
    'favoritou sua partitura',
    auth.uid(),
    sheet_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para remover dos favoritos
CREATE OR REPLACE FUNCTION unfavorite_sheet(
  sheet_id bigint
) RETURNS void AS $$
BEGIN
  DELETE FROM favorites
  WHERE user_id = auth.uid()
  AND sheet_id = sheet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para marcar notificação como lida
CREATE OR REPLACE FUNCTION mark_notification_read(
  notification_id bigint
) RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET read = true
  WHERE id = notification_id
  AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas de uma partitura
CREATE OR REPLACE FUNCTION get_sheet_stats(
  sheet_id bigint
) RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'likes_count', (SELECT count(*) FROM likes WHERE sheet_id = $1),
    'comments_count', (SELECT count(*) FROM comments WHERE sheet_id = $1),
    'favorites_count', (SELECT count(*) FROM favorites WHERE sheet_id = $1),
    'average_rating', (SELECT COALESCE(avg(rating)::numeric(10,2), 0) FROM ratings WHERE sheet_id = $1),
    'ratings_count', (SELECT count(*) FROM ratings WHERE sheet_id = $1)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 