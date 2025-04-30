import { useState } from 'react';
import {
  Box,
  Avatar,
  Typography,
  TextField,
  Button,
  Stack,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  ThumbUp as ThumbUpIcon,
  ThumbUpOutlined as ThumbUpOutlinedIcon,
  Reply as ReplyIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface Comment {
  id: number;
  user: {
    id: number;
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  replies: Comment[];
}

interface CommentSectionProps {
  comments: Comment[];
  currentUser: {
    id: number;
    name: string;
    avatar: string;
  } | null;
  onAddComment: (content: string, parentId?: number) => Promise<void>;
  onLikeComment: (commentId: number) => Promise<void>;
  onDeleteComment: (commentId: number) => Promise<void>;
  onEditComment: (commentId: number, content: string) => Promise<void>;
}

export default function CommentSection({
  comments,
  currentUser,
  onAddComment,
  onLikeComment,
  onDeleteComment,
  onEditComment,
}: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedComment, setSelectedComment] = useState<number | null>(null);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    await onAddComment(newComment);
    setNewComment('');
  };

  const handleSubmitReply = async (parentId: number) => {
    if (!replyContent.trim()) return;
    await onAddComment(replyContent, parentId);
    setReplyContent('');
    setReplyTo(null);
  };

  const handleSubmitEdit = async (commentId: number) => {
    if (!editContent.trim()) return;
    await onEditComment(commentId, editContent);
    setEditingComment(null);
    setEditContent('');
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    commentId: number
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedComment(commentId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedComment(null);
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
    handleMenuClose();
  };

  const handleDelete = async (commentId: number) => {
    await onDeleteComment(commentId);
    handleMenuClose();
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          ml: isReply ? 6 : 0,
          bgcolor: 'background.default',
        }}
      >
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={comment.user.avatar} alt={comment.user.name} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2">{comment.user.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {comment.timestamp}
              </Typography>
            </Box>
            {currentUser?.id === comment.user.id && (
              <IconButton
                size="small"
                onClick={(e) => handleMenuOpen(e, comment.id)}
              >
                <MoreVertIcon />
              </IconButton>
            )}
          </Box>

          {editingComment === comment.id ? (
            <Box>
              <TextField
                fullWidth
                multiline
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                size="small"
              />
              <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  onClick={() => setEditingComment(null)}
                >
                  Cancelar
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleSubmitEdit(comment.id)}
                >
                  Salvar
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography>{comment.content}</Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              startIcon={
                comment.isLiked ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />
              }
              onClick={() => onLikeComment(comment.id)}
              color={comment.isLiked ? 'primary' : 'inherit'}
            >
              {comment.likes}
            </Button>
            {!isReply && currentUser && (
              <Button
                size="small"
                startIcon={<ReplyIcon />}
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
              >
                Responder
              </Button>
            )}
          </Box>

          {replyTo === comment.id && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Escreva uma resposta..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                multiline
                maxRows={4}
              />
              <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button size="small" onClick={() => setReplyTo(null)}>
                  Cancelar
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleSubmitReply(comment.id)}
                >
                  Responder
                </Button>
              </Box>
            </Box>
          )}

          {comment.replies?.map((reply) => (
            <CommentItem key={reply.id} comment={reply} isReply />
          ))}
        </Stack>
      </Paper>
    </motion.div>
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Comentários
      </Typography>

      {currentUser ? (
        <Box sx={{ mb: 4 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Escreva um comentário..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleSubmitComment}
              disabled={!newComment.trim()}
            >
              Comentar
            </Button>
          </Box>
        </Box>
      ) : (
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Faça login para comentar
        </Typography>
      )}

      <Stack spacing={2}>
        <AnimatePresence>
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </AnimatePresence>
      </Stack>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() =>
            selectedComment &&
            handleStartEdit(
              comments.find((c) => c.id === selectedComment) as Comment
            )
          }
        >
          Editar
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => selectedComment && handleDelete(selectedComment)}
          sx={{ color: 'error.main' }}
        >
          Excluir
        </MenuItem>
      </Menu>
    </Box>
  );
} 