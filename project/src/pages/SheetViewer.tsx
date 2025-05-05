import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Music, Star, MessageSquare, Reply, ThumbsUp, Trash2, Send, Download, Share2, FileText, Image } from 'lucide-react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import type { MusicSheet, Comment as CommentType, Rating } from '../types/database';
import { 
  Box, 
  Typography, 
  Stack, 
  Chip, 
  TextField,
  Button,
  Avatar,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Divider,
  Badge,
  Paper,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
  Container,
  Grid,
} from '@mui/material';
import SheetMusicViewer from '../components/SheetMusicViewer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

// Estender a interface Comment para incluir respostas 
interface CommentWithReplies extends CommentType {
  user_avatar?: string;
  user_name?: string;
  likes: number;
  user_liked: boolean;
  replies?: CommentWithReplies[];
  isEditing?: boolean;
  isReplying?: boolean;
}

// Opções de exportação
interface ExportOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  action: () => void;
}

const SheetViewer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [sheet, setSheet] = useState<MusicSheet | null>(null);
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userRating, setUserRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentError, setCommentError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [editCommentText, setEditCommentText] = useState('');
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState('');
  const theme = useTheme();

  useEffect(() => {
    const fetchSheetData = async () => {
      try {
        if (!id) return;

        const { data: sheetData, error: sheetError } = await supabase
          .from('music_sheets')
          .select('*')
          .eq('id', id)
          .single();

        if (sheetError) throw sheetError;
        setSheet(sheetData);

        // Buscar comentários com informações do usuário
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select(`
            *,
            profiles:user_id (
              username,
              avatar_url
            )
          `)
          .eq('sheet_id', id)
          .order('created_at', { ascending: false });

        if (commentsError) throw commentsError;
        
        // Buscar likes dos comentários
        const { data: likesData, error: likesError } = await supabase
          .from('comment_likes')
          .select('*')
          .in('comment_id', commentsData.map((c: CommentType) => c.id));
          
        if (likesError) throw likesError;

        // Organizar comentários e respostas
        const commentsWithReplies = commentsData
          .filter((c: CommentType) => !c.parent_id)
          .map((comment: CommentType) => {
            const commentLikes = likesData?.filter((l: { comment_id: string }) => l.comment_id === comment.id) || [];
            const userLiked = user ? commentLikes.some((l: { user_id: string }) => l.user_id === user.id) : false;
            
            // Encontrar respostas para este comentário
            const replies = commentsData
              .filter((c: CommentType) => c.parent_id === comment.id)
              .map((reply: CommentType) => {
                const replyLikes = likesData?.filter((l: { comment_id: string }) => l.comment_id === reply.id) || [];
                const userLikedReply = user ? replyLikes.some((l: { user_id: string }) => l.user_id === user.id) : false;
                
                return {
                  ...reply,
                  user_name: reply.profiles?.username || 'Usuário',
                  user_avatar: reply.profiles?.avatar_url || '',
                  likes: replyLikes.length,
                  user_liked: userLikedReply
                };
              });
              
            return {
              ...comment,
              user_name: comment.profiles?.username || 'Usuário',
              user_avatar: comment.profiles?.avatar_url || '',
              likes: commentLikes.length,
              user_liked: userLiked,
              replies
            };
          });
          
        setComments(commentsWithReplies);

        const { data: ratingsData, error: ratingsError } = await supabase
          .from('ratings')
          .select('*')
          .eq('sheet_id', id);

        if (ratingsError) throw ratingsError;
        setRatings(ratingsData);

        if (user) {
          const userRating = ratingsData.find((r: Rating) => r.user_id === user.id);
          if (userRating) setUserRating(userRating.score);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSheetData();

    // Realtime: escuta mudanças na partitura específica
    const channel = supabase
      .channel('sheet:music_sheets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_sheets', filter: `id=eq.${id}` }, fetchSheetData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !sheet || !newComment.trim()) {
      setCommentError('Por favor, escreva um comentário antes de enviar.');
      return;
    }

    setCommentError('');
    
    try {
      const { error: commentError, data } = await supabase
        .from('comments')
        .insert([{
          content: newComment.trim(),
          user_id: user.id,
          sheet_id: sheet.id
        }])
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .single();

      if (commentError) throw commentError;
      
      const newCommentWithMetadata = {
        ...data,
        user_name: data.profiles?.username || 'Usuário',
        user_avatar: data.profiles?.avatar_url || '',
        likes: 0,
        user_liked: false,
        replies: []
      };
      
      setComments([newCommentWithMetadata, ...comments]);
      setNewComment('');
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Erro ao adicionar comentário');
    }
  };

  const handleReply = async (parentId: string) => {
    if (!user || !sheet || !replyText.trim()) return;
    
    try {
      const { error: replyError, data } = await supabase
        .from('comments')
        .insert([{
          content: replyText.trim(),
          user_id: user.id,
          sheet_id: sheet.id,
          parent_id: parentId
        }])
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .single();

      if (replyError) throw replyError;
      
      const newReply = {
        ...data,
        user_name: data.profiles?.username || 'Usuário',
        user_avatar: data.profiles?.avatar_url || '',
        likes: 0,
        user_liked: false
      };
      
      // Atualizar comentários com a nova resposta
      const updatedComments = comments.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), newReply],
            isReplying: false
          };
        }
        return comment;
      });
      
      setComments(updatedComments);
      setReplyText('');
    } catch (err) {
      console.error('Erro ao responder comentário:', err);
    }
  };

  const toggleLikeComment = async (commentId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // Verificar se o usuário já curtiu este comentário
    const commentToUpdate = comments.find(c => c.id === commentId) || 
                          comments.flatMap(c => c.replies || []).find(r => r.id === commentId);
    
    if (!commentToUpdate) return;
    
    const alreadyLiked = commentToUpdate.user_liked;
    
    try {
      if (alreadyLiked) {
        // Remover o like
        await supabase
          .from('comment_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('comment_id', commentId);
      } else {
        // Adicionar o like
        await supabase
          .from('comment_likes')
          .insert([{
            user_id: user.id,
            comment_id: commentId
          }]);
      }
      
      // Atualizar estado local
      const updateComment = (comment: CommentWithReplies): CommentWithReplies => {
        if (comment.id === commentId) {
          return {
            ...comment,
            likes: alreadyLiked ? comment.likes - 1 : comment.likes + 1,
            user_liked: !alreadyLiked
          };
        }
        
        if (comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map(reply => updateComment(reply))
          };
        }
        
        return comment;
      };
      
      setComments(comments.map(comment => updateComment(comment)));
      
    } catch (err) {
      console.error('Erro ao curtir comentário:', err);
    }
  };

  const toggleReplyMode = (commentId: string) => {
    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        return { ...comment, isReplying: !comment.isReplying };
      }
      return comment;
    }));
    setReplyText('');
  };

  const toggleEditMode = (commentId: string, currentContent?: string) => {
    // Procurar comentário em todos os níveis
    const findAndUpdateComment = (comments: CommentWithReplies[]): CommentWithReplies[] => {
      return comments.map(comment => {
        if (comment.id === commentId) {
          setEditCommentText(comment.content);
          return { ...comment, isEditing: !comment.isEditing };
        }
        
        if (comment.replies) {
          return {
            ...comment,
            replies: findAndUpdateComment(comment.replies)
          };
        }
        
        return comment;
      });
    };
    
    setComments(findAndUpdateComment(comments));
  };

  const saveEditedComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    
    try {
      await supabase
        .from('comments')
        .update({ content: editCommentText.trim() })
        .eq('id', commentId);
        
      // Atualizar estado local
      const updateEditedComment = (comments: CommentWithReplies[]): CommentWithReplies[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            return { 
              ...comment, 
              content: editCommentText.trim(),
              isEditing: false 
            };
          }
          
          if (comment.replies) {
            return {
              ...comment,
              replies: updateEditedComment(comment.replies)
            };
          }
          
          return comment;
        });
      };
      
      setComments(updateEditedComment(comments));
      setEditCommentText('');
      
    } catch (err) {
      console.error('Erro ao editar comentário:', err);
    }
  };

  const confirmDeleteComment = (commentId: string) => {
    setDeleteCommentId(commentId);
    setShowDeleteDialog(true);
  };

  const handleDeleteComment = async () => {
    if (!deleteCommentId) return;
    
    try {
      await supabase
        .from('comments')
        .delete()
        .eq('id', deleteCommentId);
      
      // Remover o comentário do estado
      const removeComment = (comments: CommentWithReplies[]): CommentWithReplies[] => {
        // Filtrar comentários de alto nível
        const filtered = comments.filter(c => c.id !== deleteCommentId);
        
        // Filtrar respostas em cada comentário
        return filtered.map(comment => {
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.filter(reply => reply.id !== deleteCommentId)
            };
          }
          return comment;
        });
      };
      
      setComments(removeComment(comments));
      setShowDeleteDialog(false);
      setDeleteCommentId(null);
      
    } catch (err) {
      console.error('Erro ao excluir comentário:', err);
    }
  };

  // Função para gerenciar avaliações da partitura
  const handleRating = async (score: number) => {
    if (!user || !sheet) return;
    
    try {
      setUserRating(score);
      
      // Verificar se o usuário já avaliou essa partitura
      const existingRating = ratings.find(r => r.user_id === user.id);
      
      if (existingRating) {
        // Atualizar avaliação existente
        await supabase
          .from('ratings')
          .update({ score })
          .match({ 
            user_id: user.id,
            sheet_id: sheet.id
          });
          
        // Atualizar state local
        setRatings(ratings.map(r => 
          r.user_id === user.id && r.sheet_id === sheet.id ? { ...r, score } : r
        ));
      } else {
        // Criar nova avaliação
        const { data, error } = await supabase
          .from('ratings')
          .insert([{
            user_id: user.id,
            sheet_id: sheet.id,
            score
          }])
          .select()
          .single();
          
        if (error) throw error;
        
        // Adicionar ao state local
        setRatings([...ratings, data]);
      }
    } catch (err) {
      console.error('Erro ao avaliar partitura:', err);
      // Reverter a classificação local em caso de erro
      const currentRating = ratings.find(r => r.user_id === user.id);
      setUserRating(currentRating?.score || 0);
    }
  };

  // Função para exportar partitura
  const handleExportSheet = async (format: string) => {
    if (!sheet?.file_url) {
      setExportError('Arquivo de partitura não disponível para exportação');
      return;
    }

    setExportLoading(true);
    setExportError('');

    try {
      // Obter URL pública do arquivo
      const { data } = supabase
        .storage
        .from('music-sheets')
        .getPublicUrl(sheet.file_url);
      
      if (!data.publicUrl) {
        throw new Error('Não foi possível gerar URL pública para o arquivo');
      }
      
      // Se for PDF e o usuário quiser exportar como está
      if (format === 'pdf' && sheet.file_url.endsWith('.pdf')) {
        // Download direto do PDF
        window.open(data.publicUrl, '_blank');
        setShowExportDialog(false);
        setExportLoading(false);
        return;
      }
      
      // Se for para outra conversão (aqui simularemos apenas o download da versão atual)
      // Em uma implementação real, usaríamos uma API de conversão como o CloudConvert
      
      const a = document.createElement('a');
      a.href = data.publicUrl;
      a.download = `${sheet.title} - ${sheet.composer}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setShowExportDialog(false);
    } catch (err) {
      console.error('Erro na exportação:', err);
      setExportError('Falha ao exportar o arquivo. Por favor, tente novamente.');
    } finally {
      setExportLoading(false);
    }
  };

  // Opções de exportação disponíveis
  const exportOptions: ExportOption[] = [
    {
      id: 'pdf',
      label: 'PDF',
      icon: <FileText size={24} />,
      description: 'Exportar no formato PDF original',
      action: () => handleExportSheet('pdf'),
    },
    {
      id: 'png',
      label: 'Imagem PNG',
      icon: <Image size={24} />,
      description: 'Exportar como imagem de alta qualidade',
      action: () => handleExportSheet('png'),
    },
    {
      id: 'musicxml',
      label: 'MusicXML',
      icon: <Music size={24} />,
      description: 'Formato compatível com editores de partituras',
      action: () => handleExportSheet('musicxml'),
    }
  ];

  const handleDelete = async () => {
    if (!sheet) return;
    const { error } = await supabase
      .from('music_sheets')
      .delete()
      .eq('id', sheet.id);
    if (!error) navigate('/library');
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: theme.palette.mode === 'light' ? '#FAFAFA' : '#121212'
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Stack spacing={2} alignItems="center">
            <CircularProgress size={60} thickness={4} />
            <Typography variant="h6" color="text.secondary">
              Carregando partitura...
            </Typography>
          </Stack>
        </motion.div>
      </Box>
    );
  }

  if (!sheet) {
    return (
      <Box 
        sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: theme.palette.mode === 'light' ? '#FAFAFA' : '#121212'
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper 
            elevation={0}
            sx={{ 
              p: 4, 
              textAlign: 'center',
              borderRadius: 3,
              background: theme.palette.mode === 'light' 
                ? alpha(theme.palette.primary.main, 0.05) 
                : alpha(theme.palette.primary.main, 0.1),
            }}
          >
            <Music size={48} color={theme.palette.primary.main} />
            <Typography variant="h5" color="text.secondary" sx={{ mt: 2 }}>
              Partitura não encontrada
            </Typography>
          </Paper>
        </motion.div>
      </Box>
    );
  }

  const averageRating = ratings.length
    ? ratings.reduce((acc, curr) => acc + curr.score, 0) / ratings.length
    : 0;

  const isOwner = user && sheet.user_id === user.id;

  return (
    <Container maxWidth="xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box
          sx={{
            position: 'relative',
            mb: 4,
            p: 4,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            color: 'white',
            overflow: 'hidden',
          }}
        >
          <IconButton
            sx={{ position: 'absolute', top: 16, left: 16, color: 'white' }}
            onClick={() => navigate(-1)}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Typography variant="h4" component="h1" sx={{ mt: 2, textAlign: 'center', fontWeight: 'bold' }}>
            {sheet?.title || 'Carregando...'}
          </Typography>
          
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            alignItems="center"
            sx={{ mt: 2 }}
          >
            <Chip
              icon={<Music size={16} />}
              label={sheet?.instrument || 'Instrumento'}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                '& .MuiChip-icon': { color: 'white' }
              }}
            />
            <Chip
              icon={<Star size={16} />}
              label={`${sheet?.difficulty || 'Fácil'}`}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                '& .MuiChip-icon': { color: 'white' }
              }}
            />
          </Stack>

          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            sx={{ mt: 3 }}
          >
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={() => setShowExportDialog(true)}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              Exportar
            </Button>
            <Button
              variant="contained"
              startIcon={<Share2 />}
              onClick={() => {/* Implement share functionality */}}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              Compartilhar
            </Button>
          </Stack>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  bgcolor: theme.palette.background.paper,
                }}
              >
                <Box sx={{ position: 'relative', minHeight: 400 }}>
                  {loading ? (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: 400,
                      }}
                    >
                      <CircularProgress />
                    </Box>
                  ) : error ? (
                    <Alert severity="error">{error}</Alert>
                  ) : (
                    <SheetMusicViewer 
                      sheetUrl={sheet.file_url || ''}
                      midiUrl={sheet.midi_url || ''}
                    />
                  )}
                </Box>
              </Paper>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={4}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Stack spacing={3}>
                <Paper
                  elevation={3}
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    bgcolor: theme.palette.background.paper,
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    Detalhes
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Compositor
                      </Typography>
                      <Typography>{sheet?.composer || 'Não especificado'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Publicado em
                      </Typography>
                      <Typography>
                        {sheet?.created_at
                          ? format(new Date(sheet.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
                          : 'Data não disponível'}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>

                {/* Avaliações */}
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 3, 
                    borderRadius: 3,
                    background: theme.palette.mode === 'light' 
                      ? alpha(theme.palette.primary.main, 0.02) 
                      : alpha(theme.palette.primary.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    <Box sx={{ color: 'warning.main' }}>
                      <Star />
                    </Box>
                    <Typography variant="h6" fontWeight="600">
                      Avaliações
                    </Typography>
                  </Stack>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="h4" fontWeight="bold" color="primary">
                        {averageRating.toFixed(1)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {ratings.length} {ratings.length === 1 ? 'avaliação' : 'avaliações'}
                      </Typography>
                    </Box>
                    {user && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Sua avaliação
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          {[1, 2, 3, 4, 5].map((score) => (
                            <IconButton
                              key={score}
                              onClick={() => handleRating(score)}
                              sx={{
                                color: score <= userRating ? 'warning.main' : 'action.disabled',
                                '&:hover': {
                                  color: 'warning.main',
                                  transform: 'scale(1.1)',
                                },
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <Star />
                            </IconButton>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Paper>

                {/* Comentários */}
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 3, 
                    borderRadius: 3,
                    background: theme.palette.mode === 'light' 
                      ? alpha(theme.palette.primary.main, 0.02) 
                      : alpha(theme.palette.primary.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    <Box sx={{ color: 'primary.main' }}>
                      <MessageSquare />
                    </Box>
                    <Typography variant="h6" fontWeight="600">
                      Comentários
                    </Typography>
                  </Stack>

                  {user && (
                    <Box sx={{ mb: 3 }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Adicione um comentário..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                            },
                          },
                        }}
                      />
                      <Button
                        variant="contained"
                        onClick={handleComment}
                        disabled={!newComment.trim()}
                        sx={{
                          mt: 1,
                          borderRadius: '30px',
                          px: 3,
                          py: 1,
                          background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                          boxShadow: '0 8px 16px rgba(127, 86, 217, 0.2)',
                          '&:hover': {
                            background: `linear-gradient(90deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                          }
                        }}
                      >
                        Comentar
                      </Button>
                    </Box>
                  )}

                  <Stack spacing={2}>
                    {comments.map((comment) => (
                      <Card 
                        key={comment.id}
                        variant="outlined"
                        sx={{ 
                          borderRadius: 2,
                          borderColor: alpha(theme.palette.primary.main, 0.1),
                        }}
                      >
                        <CardContent>
                          <Stack direction="row" spacing={2}>
                            <Avatar 
                              src={comment.user_avatar} 
                              alt={comment.user_name}
                              sx={{ 
                                width: 40, 
                                height: 40,
                                border: '2px solid',
                                borderColor: 'primary.main'
                              }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="subtitle2" fontWeight="600">
                                  {comment.user_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {format(new Date(comment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                </Typography>
                              </Stack>
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                {comment.content}
                              </Typography>
                              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => toggleLikeComment(comment.id)}
                                  color={comment.user_liked ? 'primary' : 'default'}
                                >
                                  <ThumbsUp size={16} />
                                </IconButton>
                                <Typography variant="caption" color="text.secondary">
                                  {comment.likes}
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={() => toggleReplyMode(comment.id)}
                                >
                                  <Reply size={16} />
                                </IconButton>
                              </Stack>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Paper>
              </Stack>
            </motion.div>
          </Grid>
        </Grid>
      </motion.div>

      {/* Diálogos */}
      <Dialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }
        }}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="600">
            Exportar Partitura
          </Typography>
        </DialogTitle>
        <DialogContent>
          {exportError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {exportError}
            </Alert>
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Escolha o formato para exportar esta partitura:
          </Typography>
          
          <Stack spacing={2}>
            {exportOptions.map((option) => (
              <Card 
                key={option.id}
                variant="outlined"
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.2s ease',
                  borderRadius: 2,
                }}
                onClick={exportLoading ? undefined : option.action}
              >
                <CardContent sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                }}>
                  <Box sx={{ 
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {option.icon}
                  </Box>
                  <Box>
                    <Typography variant="subtitle1">
                      {option.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.description}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setShowExportDialog(false)}
            disabled={exportLoading}
            sx={{ borderRadius: '30px', px: 3 }}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }
        }}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="600">
            Excluir Comentário
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza de que deseja excluir este comentário?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setShowDeleteDialog(false)}
            sx={{ borderRadius: '30px', px: 3 }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteComment}
            color="error"
            variant="contained"
            sx={{ 
              borderRadius: '30px', 
              px: 3,
              background: `linear-gradient(90deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
              boxShadow: '0 8px 16px rgba(211, 47, 47, 0.2)',
              '&:hover': {
                background: `linear-gradient(90deg, ${theme.palette.error.dark} 0%, ${theme.palette.error.main} 100%)`,
              }
            }}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SheetViewer;