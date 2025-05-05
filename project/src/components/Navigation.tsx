import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
  Avatar,
  Button,
  Tooltip,
  Badge,
  alpha,
  ListItemButton,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  LibraryMusic as LibraryMusicIcon,
  CloudUpload as CloudUploadIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  NotificationsOutlined as NotificationIcon,
  DarkModeOutlined as DarkModeIcon,
  LightModeOutlined as LightModeIcon,
  PlaylistPlay as PlaylistIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useThemeContext } from '../context/ThemeContext';
import Logo from './Logo';

const drawerWidth = 250;

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { mode, toggleColorMode } = useThemeContext();

  // Detectar rolagem para mudar o estilo da AppBar
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const menuItems = [
    { text: 'Início', icon: <HomeIcon />, path: '/' },
    { text: 'Explorar', icon: <SearchIcon />, path: '/explore' },
    ...(user ? [
      { text: 'Biblioteca', icon: <LibraryMusicIcon />, path: '/library' },
      { text: 'Playlists', icon: <PlaylistIcon />, path: '/playlists' },
      { text: 'Upload', icon: <CloudUploadIcon />, path: '/upload' },
    ] : []),
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{ mt: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 4,
        }}
      >
        <Logo size="medium" withAnimation={true} />
      </Box>
      <List>
        {menuItems.map((item, index) => (
          <motion.div
            key={item.text}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <ListItemButton
              onClick={() => {
                navigate(item.path);
                if (isMobile) handleDrawerToggle();
              }}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: '10px',
                mx: 1,
                mb: 1,
                transition: 'all 0.3s ease',
                '&.Mui-selected': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.15),
                  color: 'primary.main',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.main',
                  },
                },
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  transform: 'translateX(5px)',
                },
              }}
            >
              <ListItemIcon 
                sx={{ 
                  minWidth: 40,
                  color: location.pathname === item.path ? 'primary.main' : 'gray.500',
                  transition: 'color 0.3s ease'
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={
                  <Typography 
                    sx={{
                      fontWeight: location.pathname === item.path ? 600 : 500,
                      fontSize: "0.95rem"
                    }}
                  >
                    {item.text}
                  </Typography>
                } 
              />
            </ListItemButton>
          </motion.div>
        ))}
      </List>
      {user && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            borderRadius: 3,
            p: 2,
            mx: 2,
            mt: 4,
            mb: 2,
          }}
        >
          <Avatar
            src={user.user_metadata?.avatar_url || undefined}
            alt={user.user_metadata?.name || user.email || 'User'}
            sx={{ width: 48, height: 48, mr: 2, bgcolor: 'background.paper', color: 'primary.main', fontWeight: 700 }}
          />
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: '1rem', lineHeight: 1.2 }} noWrap>
              {user.email}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );

  return (
    <>
      <AppBar
        position="fixed"
        elevation={scrolled ? 2 : 0}
        component={motion.div}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: scrolled ? 'background.paper' : 'transparent',
          color: 'text.primary',
          backdropFilter: scrolled ? 'blur(10px)' : 'none',
          transition: 'all 0.3s ease',
          borderBottom: scrolled ? '1px solid' : 'none',
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2, 
              display: { sm: 'none' },
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'rotate(180deg)',
              }
            }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}
          >
            <Logo size="small" withAnimation={false} />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Notificações">
              <IconButton 
                color="inherit"
                component={motion.button}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Badge badgeContent={3} color="secondary">
                  <NotificationIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Alternar tema">
              <IconButton 
                color="inherit"
                component={motion.button}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleColorMode}
              >
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            {user ? (
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Avatar
                  src={user.user_metadata?.avatar_url || undefined}
                  alt={user.user_metadata?.name || user.email || 'User'}
                  sx={{ 
                    cursor: 'pointer',
                    width: 38,
                    height: 38,
                    border: '2px solid',
                    borderColor: 'primary.main'
                  }}
                  onClick={() => navigate('/profile')}
                />
              </motion.div>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate('/auth')}
                component={motion.button}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                sx={{
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                }}
              >
                Entrar
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid',
              borderColor: 'divider',
              pt: { xs: 7, sm: 8 },
              boxShadow: isMobile ? '0 4px 20px rgba(0,0,0,0.1)' : 'none',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Toolbar />
    </>
  );
} 