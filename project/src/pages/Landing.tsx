import { motion, useAnimation, useInView } from 'framer-motion';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Avatar,
  Stack,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
  AppBar,
  Toolbar,
  Grid,
} from '@mui/material';
import {
  MusicNote,
  CloudUpload,
  People,
  Speed,
  Star,
  ArrowForward,
  DarkModeOutlined,
  LightModeOutlined,
  Login,
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useThemeContext } from '../context/ThemeContext';

const features = [
  {
    icon: <MusicNote sx={{ fontSize: 40 }} />,
    title: 'Biblioteca Extensa',
    description: 'Acesse milhares de partituras de diversos gêneros e instrumentos.',
  },
  {
    icon: <CloudUpload sx={{ fontSize: 40 }} />,
    title: 'Upload Fácil',
    description: 'Compartilhe suas partituras com a comunidade em poucos cliques.',
  },
  {
    icon: <Speed sx={{ fontSize: 40 }} />,
    title: 'Player Interativo',
    description: 'Pratique com nosso player interativo com controle de velocidade.',
  },
  {
    icon: <People sx={{ fontSize: 40 }} />,
    title: 'Comunidade Ativa',
    description: 'Conecte-se com músicos do mundo todo e compartilhe experiências.',
  },
];

// Variantes para animações
const heroContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    }
  }
};

const heroItemVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12
    }
  }
};

const heroImageVariants = {
  hidden: { opacity: 0, scale: 0.8, rotate: -5 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring",
      duration: 1,
      bounce: 0.4
    }
  }
};

const buttonHoverVariants = {
  hover: {
    scale: 1.05,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  }
};

export default function Landing() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const heroControls = useAnimation();
  const heroRef = useRef(null);
  const isHeroInView = useInView(heroRef, { once: true, amount: 0.3 });
  const { mode, toggleColorMode } = useThemeContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (isHeroInView) {
      heroControls.start("visible");
    }
  }, [isHeroInView, heroControls]);

  return (
    <Box>
      {/* Barra de navegação superior */}
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
          bgcolor: 'transparent',
          boxShadow: 'none',
          zIndex: 10,
        }}
      >
        <Toolbar sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Stack direction="row" spacing={1}>
            <Tooltip title={mode === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}>
              <IconButton 
                onClick={toggleColorMode} 
                sx={{ color: 'white' }}
              >
                {mode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />}
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<Login />}
              onClick={() => navigate('/auth')}
              sx={{ 
                color: 'white', 
                borderColor: 'white',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              Login
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        ref={heroRef}
        sx={{
          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          color: 'white',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated background elements */}
        <Box sx={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1 }}>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                opacity: 0.3, 
                scale: Math.random() * 0.5 + 0.5,
                x: `${Math.random() * 100}%`, 
                y: `${Math.random() * 100}%` 
              }}
              animate={{ 
                opacity: [0.2, 0.4, 0.2],
                y: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
                x: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
              }}
              transition={{ 
                repeat: Infinity,
                repeatType: "reverse",
                duration: Math.random() * 10 + 10, 
                ease: "easeInOut" 
              }}
              style={{
                position: 'absolute',
                width: `${Math.random() * 150 + 50}px`,
                height: `${Math.random() * 150 + 50}px`,
                borderRadius: '50%',
                background: `rgba(255, 255, 255, 0.05)`,
                filter: 'blur(10px)',
              }}
            />
          ))}
        </Box>

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          <motion.div
            variants={heroContainerVariants}
            initial="hidden"
            animate={heroControls}
          >
            <Stack direction="row" spacing={4} alignItems="center">
              <Box sx={{ flex: 1 }}>
                <motion.div variants={heroItemVariants}>
                  <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', fontSize: '2.0rem' }}>
                    Revolucione Sua Experiência Musical
                  </Typography>
                </motion.div>
                <motion.div variants={heroItemVariants}>
                  <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
                    Descubra, aprenda e compartilhe partituras com músicos do mundo todo.
                  </Typography>
                </motion.div>
                
                <Stack direction="row" spacing={2}>
                  <motion.div variants={buttonHoverVariants} whileHover="hover">
                    <Button
                      component={Link}
                      to="/auth"
                      variant="contained"
                      size="large"
                      color="secondary"
                      endIcon={<ArrowForward />}
                      sx={{ borderRadius: '50px' }}
                    >
                      Começar Agora
                    </Button>
                  </motion.div>
                  <motion.div variants={buttonHoverVariants} whileHover="hover">
                    <Button
                      component={Link}
                      to="/explore"
                      variant="outlined"
                      size="large"
                      sx={{ borderRadius: '50px', color: 'white', borderColor: 'white' }}
                    >
                      Explorar Partituras
                    </Button>
                  </motion.div>
                </Stack>
              </Box>
              
              <Box sx={{ flex: 1 }}>
                <motion.div 
                  variants={heroImageVariants}
                  animate={{
                    y: ["0%", "-2%", "0%"],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                  }}
                >
                  <Box
                    component="img"
                    src="/LogoLanding.png"
                    alt="Music Sheet Platform"
                    sx={{
                      width: '100%',
                      maxWidth: 600,
                      height: 'auto',
                      filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.3))',
                    }}
                  />
                </motion.div>
              </Box>
            </Stack>
          </motion.div>
        </Container>
      </Box>

      {/* Features Section */}
      <Container sx={{ py: 12 }}>
        <Typography
          variant="h2"
          align="center"
          sx={{ mb: 8, fontSize: isMobile ? '2rem' : '3rem' }}
        >
          Recursos Incríveis
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item={true} xs={12} sm={6} md={3} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                style={{ height: '100%' }}
              >
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    p: 3,
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      transition: 'transform 0.3s ease-in-out',
                    },
                  }}
                >
                  <Box sx={{ mb: 2, color: 'primary.main' }}>{feature.icon}</Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary">{feature.description}</Typography>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 12,
          textAlign: 'center',
        }}
      >
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Typography variant="h3" sx={{ mb: 3, fontSize: isMobile ? '2rem' : '2.5rem' }}>
              Pronto para Começar?
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
              Junte-se à nossa comunidade e comece a compartilhar sua música hoje mesmo.
            </Typography>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="contained"
                size="large"
                color="secondary"
                endIcon={<ArrowForward />}
                component={Link}
                to="/auth?signup=true"
                sx={{ borderRadius: '50px', px: 4 }}
              >
                Criar Conta Gratuita
              </Button>
            </motion.div>
          </motion.div>
        </Container>
      </Box>
    </Box>
  );
} 