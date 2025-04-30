import { type FC } from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, useTheme } from '@mui/material';
import { Link } from 'react-router-dom';

type LogoSize = 'small' | 'medium' | 'large';

interface LogoProps {
  size?: LogoSize;
  withAnimation?: boolean;
  to?: string;
}

const Logo: FC<LogoProps> = ({ 
  size = 'medium', 
  withAnimation = true,
  to = '/'
}) => {
  const theme = useTheme();
  
  const dimensions: Record<LogoSize, { width: number; height: number }> = {
    small: { width: 120, height: 40 },
    medium: { width: 150, height: 50 },
    large: { width: 200, height: 67 },
  };
  
  // URL da imagem - usando caminho absoluto
  const logoUrl = `${window.location.origin}/logoPP.png`;
  
  // Wrapper do componente
  const LogoWrapper = ({ children }: { children: React.ReactNode }) => {
    if (to) {
      return <Link to={to} style={{ textDecoration: 'none' }}>{children}</Link>;
    }
    return <>{children}</>;
  };

  // Fallback text logo para quando a imagem não está disponível
  const TextLogo = () => (
    <Typography 
      variant={size === 'small' ? 'h6' : size === 'medium' ? 'h5' : 'h4'} 
      fontWeight="bold"
      sx={{ 
        background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '0.5px'
      }}
    >
      MusicStation
    </Typography>
  );
  
  return (
    <LogoWrapper>
      {withAnimation ? (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              component="img"
              src={logoUrl}
              alt="MusicStation"
              sx={{
                ...dimensions[size],
                objectFit: 'contain',
                transition: 'filter 0.3s ease',
                filter: theme.palette.mode === 'dark' ? 'brightness(1.2)' : 'none',
                display: 'block',
              }}
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <Box sx={{ display: 'none' }}>
              <TextLogo />
            </Box>
          </Box>
        </motion.div>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            component="img"
            src={logoUrl}
            alt="MusicStation"
            sx={{
              ...dimensions[size],
              objectFit: 'contain',
              transition: 'filter 0.3s ease',
              filter: theme.palette.mode === 'dark' ? 'brightness(1.2)' : 'none',
              display: 'block',
            }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.style.display = 'none';
              const textLogo = e.currentTarget.nextElementSibling;
              if (textLogo) {
                (textLogo as HTMLElement).style.display = 'block';
              }
            }}
          />
          <Box sx={{ display: 'none' }}>
            <TextLogo />
          </Box>
        </Box>
      )}
    </LogoWrapper>
  );
};

export default Logo; 