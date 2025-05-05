import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  CardActions,
  IconButton,
  Box,
  Chip,
  Rating,
  alpha,
  Skeleton,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Favorite,
  FavoriteBorder,
  Download,
  PlayArrow,
  Comment,
  MusicNote,
  PictureAsPdf,
  Delete,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface MusicSheetCardProps {
  sheetId: string;
  title: string;
  composer: string;
  instrument: string;
  difficulty: number;
  imageUrl: string;
  fileUrl?: string;
  likes: number;
  downloads: number;
  comments: number;
  isLiked: boolean;
  onLike: () => void;
  onDownload: () => void;
  onPlay: () => void;
  onComment: () => void;
  onClick: () => void;
  isOwner?: boolean;
  onDelete?: () => void;
}

const MotionCard = motion(Card);

export default function MusicSheetCard({
  sheetId,
  title,
  composer,
  instrument,
  difficulty,
  imageUrl,
  fileUrl,
  likes,
  downloads,
  comments,
  isLiked,
  onLike,
  onDownload,
  onPlay,
  onComment,
  onClick,
  isOwner,
  onDelete,
}: MusicSheetCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const isPdf = fileUrl?.endsWith('.pdf');
  
  // Usar imagem padrão quando imageUrl estiver vazia ou for inválida
  const defaultImage = `https://source.unsplash.com/featured/?music,${instrument.toLowerCase()}`;
  const displayImage = imageUrl || defaultImage;

  useEffect(() => {
    if (fileUrl) {
      const { data } = supabase.storage
        .from('music-sheets')
        .getPublicUrl(fileUrl);
      setPublicUrl(data.publicUrl);
    }
  }, [fileUrl]);

  return (
    <MotionCard
      whileHover={{ 
        scale: 1.03, 
        y: -5,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      transition={{ 
        duration: 0.3,
        type: 'spring',
        stiffness: 300,
      }}
      sx={{
        maxWidth: 345,
        cursor: 'pointer',
        borderRadius: '16px',
        overflow: 'hidden',
        backgroundColor: 'background.paper',
        position: 'relative',
        transition: 'all 0.3s ease',
      }}
      onClick={onClick}
      role="article"
      aria-label={`Partitura ${title} por ${composer} para ${instrument}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <Box sx={{ position: 'relative', overflow: 'hidden', height: 180 }}>
        {!imageLoaded && !isPdf && (
          <Skeleton 
            variant="rectangular" 
            height={180} 
            animation="wave" 
            sx={{ 
              bgcolor: alpha('#9E77ED', 0.1),
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }} 
          />
        )}
        {isPdf && publicUrl ? (
          <Box
            component="iframe"
            src={`${publicUrl}#toolbar=0&navpanes=0&view=FitH`}
            title={`PDF: ${title}`}
            sx={{
              width: '100%',
              height: '100%',
              border: 'none',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          />
        ) : (
          <CardMedia
            component="img"
            height="180"
            image={displayImage}
            alt={`Partitura: ${title} por ${composer}`}
            sx={{ 
              objectFit: 'cover',
              filter: 'brightness(0.9)',
              transition: 'all 0.5s ease',
              '&:hover': {
                transform: 'scale(1.05)',
                filter: 'brightness(1)',
              }
            }}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              if (imageUrl && imageUrl !== defaultImage) {
                const img = document.createElement('img');
                img.src = defaultImage;
                img.onload = () => setImageLoaded(true);
              }
            }}
          />
        )}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '60px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            p: 1,
          }}
        >
          <Chip 
            icon={<MusicNote fontSize="small" />} 
            label={instrument} 
            size="small"
            color="primary"
            sx={{ 
              fontWeight: 600,
              backdropFilter: 'blur(4px)',
              bgcolor: alpha('#7F56D9', 0.8),
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              '& .MuiChip-icon': {
                color: 'white',
              }
            }}
          />
          <Tooltip title={`Dificuldade: ${difficulty}/5`}>
            <Rating
              value={difficulty}
              readOnly
              size="small"
              max={5}
              sx={{ 
                '& .MuiRating-icon': {
                  color: 'white',
                  filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))'
                }
              }}
            />
          </Tooltip>
        </Box>
        {isPdf && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: alpha('#7F56D9', 0.9),
              borderRadius: '50%',
              p: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PictureAsPdf sx={{ color: 'white', fontSize: 20 }} />
          </Box>
        )}
      </Box>

      <CardContent sx={{ pt: 2, pb: 1 }}>
        <Typography 
          gutterBottom 
          variant="h6" 
          component="div" 
          noWrap
          sx={{ 
            fontWeight: 600,
            fontSize: '1.1rem',
            lineHeight: 1.3,
            color: 'text.primary',
          }}
        >
          {title}
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          noWrap
          sx={{ 
            fontWeight: 500,
            mb: 1,
          }}
        >
          {composer}
        </Typography>
      </CardContent>

      <CardActions sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} alignItems="center" width="100%">
          <Tooltip title={isLiked ? "Remover dos favoritos" : "Adicionar aos favoritos"}>
            <IconButton
              aria-label="adicionar aos favoritos"
              onClick={(e) => {
                e.stopPropagation();
                onLike();
              }}
              color={isLiked ? 'primary' : 'default'}
              component={motion.button}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              sx={{
                transition: 'all 0.2s ease',
              }}
            >
              {isLiked ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                >
                  <Favorite />
                </motion.div>
              ) : (
                <FavoriteBorder />
              )}
            </IconButton>
          </Tooltip>
          <Typography variant="body2" color="text.secondary">
            {likes}
          </Typography>
          <Tooltip title="Baixar partitura">
            <IconButton
              aria-label="baixar partitura"
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              component={motion.button}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              sx={{
                transition: 'all 0.2s ease',
              }}
            >
              <Download />
            </IconButton>
          </Tooltip>
          <Typography variant="body2" color="text.secondary">
            {downloads}
          </Typography>
          <Tooltip title="Reproduzir MIDI">
            <IconButton
              aria-label="reproduzir MIDI"
              onClick={(e) => {
                e.stopPropagation();
                onPlay();
              }}
              component={motion.button}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              sx={{
                transition: 'all 0.2s ease',
              }}
            >
              <PlayArrow />
            </IconButton>
          </Tooltip>
          <Tooltip title="Comentários">
            <IconButton
              aria-label="ver comentários"
              onClick={(e) => {
                e.stopPropagation();
                onComment();
              }}
              component={motion.button}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              sx={{
                transition: 'all 0.2s ease',
              }}
            >
              <Comment />
            </IconButton>
          </Tooltip>
          <Typography variant="body2" color="text.secondary">
            {comments}
          </Typography>
          {isOwner && onDelete && (
            <Tooltip title="Excluir partitura">
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                color="error"
              >
                <Delete />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </CardActions>
    </MotionCard>
  );
} 