import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  CardActions,
  IconButton,
  Box,
  Chip,
  Stack,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  PlaylistPlay,
  Edit,
  Delete,
  Public,
  Lock,
  MusicNote,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface PlaylistCardProps {
  id: string;
  title: string;
  description?: string;
  isPublic: boolean;
  itemCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}

const MotionCard = motion(Card);

export default function PlaylistCard({
  id,
  title,
  description,
  isPublic,
  itemCount,
  onEdit,
  onDelete,
  onClick,
}: PlaylistCardProps) {
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
      }}
      onClick={onClick}
      role="article"
      aria-label={`Playlist ${title}`}
    >
      <Box sx={{ position: 'relative', height: 140, bgcolor: theme => alpha(theme.palette.primary.main, 0.1) }}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <PlaylistPlay sx={{ fontSize: 48, color: 'primary.main', opacity: 0.8 }} />
          <Typography variant="h6" color="primary.main" sx={{ opacity: 0.8 }}>
            {itemCount} {itemCount === 1 ? 'partitura' : 'partituras'}
          </Typography>
        </Box>
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 1,
          }}
        >
          <Tooltip title={isPublic ? 'Playlist pública' : 'Playlist privada'}>
            <Chip
              icon={isPublic ? <Public fontSize="small" /> : <Lock fontSize="small" />}
              label={isPublic ? 'Pública' : 'Privada'}
              size="small"
              color={isPublic ? 'success' : 'default'}
              sx={{ 
                fontWeight: 600,
                backdropFilter: 'blur(4px)',
                bgcolor: theme => alpha(isPublic ? theme.palette.success.main : theme.palette.grey[500], 0.8),
                color: 'white',
                '& .MuiChip-icon': {
                  color: 'white',
                }
              }}
            />
          </Tooltip>
        </Box>
      </Box>

      <CardContent>
        <Typography 
          gutterBottom 
          variant="h6" 
          component="div"
          sx={{ 
            fontWeight: 600,
            fontSize: '1.1rem',
            lineHeight: 1.3,
          }}
        >
          {title}
        </Typography>
        {description && (
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              mb: 1,
            }}
          >
            {description}
          </Typography>
        )}
      </CardContent>

      <CardActions sx={{ borderTop: '1px solid', borderColor: 'divider', justifyContent: 'flex-end' }}>
        <Tooltip title="Editar playlist">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit />
          </IconButton>
        </Tooltip>
        <Tooltip title="Excluir playlist">
          <IconButton
            size="small"
            color="error"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Delete />
          </IconButton>
        </Tooltip>
      </CardActions>
    </MotionCard>
  );
} 