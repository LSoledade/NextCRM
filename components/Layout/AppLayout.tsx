'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  Assignment,
  FitnessCenter,
  School,
  Event,
  AccountCircle,
  Logout,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

const drawerWidth = 280;
const drawerCollapsedWidth = 64;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Leads', icon: <People />, path: '/leads' },
  { text: 'Tarefas', icon: <Assignment />, path: '/tasks' },
  { text: 'Treinadores', icon: <FitnessCenter />, path: '/trainers' },
  { text: 'Alunos', icon: <School />, path: '/students' },
  { text: 'Sessões', icon: <Event />, path: '/sessions' },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSidebarToggle = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await signOut();
    handleProfileMenuClose();
    router.replace('/login');
    // Opcional: forçar reload para garantir estado limpo
    // window.location.reload();
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const currentDrawerWidth = sidebarExpanded ? drawerWidth : drawerCollapsedWidth;

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.background.default,
        transition: theme.transitions.create(['width'], {
          easing: theme.transitions.easing.easeInOut,
          duration: 150, // Animação mais rápida como Gmail
        }),
      }}
    >
      {/* Logo da Sidebar */}
      <Box
        sx={{
          p: sidebarExpanded ? 2 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarExpanded ? 'flex-start' : 'center',
          minHeight: 64,
          transition: theme.transitions.create(['padding', 'justify-content'], {
            easing: theme.transitions.easing.easeInOut,
            duration: 150,
          }),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FitnessCenter 
            color="primary" 
            sx={{ 
              fontSize: sidebarExpanded ? 28 : 24,
              transition: theme.transitions.create(['font-size'], {
                duration: 150,
              }),
            }} 
          />
          <Collapse in={sidebarExpanded} orientation="horizontal">
            <Typography 
              variant="h6" 
              noWrap 
              component="div" 
              color="primary"
              sx={{ 
                fontWeight: 600,
                fontSize: '1.1rem',
              }}
            >
              FavaleTrainer
            </Typography>
          </Collapse>
        </Box>
      </Box>

      {/* Lista de Navegação */}
      <List sx={{ flex: 1, px: 0.5, py: 1 }}>
        {menuItems.map((item) => {
          const isSelected = pathname === item.path;
          
          const listItemButton = (
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={isSelected}
              sx={{
                borderRadius: sidebarExpanded ? 2 : 3,
                mx: 0.5,
                my: 0.25,
                minHeight: 44,
                justifyContent: sidebarExpanded ? 'initial' : 'center',
                px: sidebarExpanded ? 2 : 0,
                width: sidebarExpanded ? 'auto' : 52,
                alignSelf: sidebarExpanded ? 'stretch' : 'center',
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main,
                  color: 'white',
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
                '&:hover': {
                  backgroundColor: isSelected ? theme.palette.primary.dark : theme.palette.action.hover,
                },
                transition: theme.transitions.create([
                  'background-color', 
                  'padding', 
                  'border-radius',
                  'width',
                  'margin'
                ], {
                  duration: 150,
                  easing: theme.transitions.easing.easeInOut,
                }),
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: sidebarExpanded ? 2 : 'auto',
                  justifyContent: 'center',
                  transition: theme.transitions.create(['margin'], {
                    duration: 150,
                  }),
                  '& svg': {
                    fontSize: '1.2rem',
                  },
                }}
              >
                {item.icon}
              </ListItemIcon>
              <Collapse in={sidebarExpanded} orientation="horizontal">
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                  sx={{
                    ml: 0.5,
                    '& .MuiListItemText-primary': {
                      transition: theme.transitions.create(['opacity'], {
                        duration: 150,
                      }),
                    },
                  }}
                />
              </Collapse>
            </ListItemButton>
          );

          return (
            <ListItem key={item.text} disablePadding>
              {!sidebarExpanded ? (
                <Tooltip title={item.text} placement="right" arrow>
                  {listItemButton}
                </Tooltip>
              ) : (
                listItemButton
              )}
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  if (isMobile) {
    // Layout mobile mantém a estrutura original do MUI
    return (
      <Box sx={{ display: 'flex' }}>
        <AppBar
          position="fixed"
          sx={{
            backgroundColor: 'white',
            color: theme.palette.text.primary,
            boxShadow: 'none',
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              CRM Personal Trainer
            </Typography>
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                <AccountCircle />
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={handleProfileMenuClose}>
                <ListItemIcon>
                  <AccountCircle fontSize="small" />
                </ListItemIcon>
                Perfil
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Sair
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              backgroundColor: theme.palette.background.default,
            },
          }}
        >
          {drawer}
        </Drawer>
        
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            mt: 8,
            backgroundColor: theme.palette.background.default,
          }}
        >
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: 3,
              p: 3,
              minHeight: 'calc(100vh - 120px)',
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    );
  }

  // Layout desktop com CSS Grid e efeito visual moderno + sidebar expansível
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `${currentDrawerWidth}px 1fr`,
        gridTemplateRows: 'auto 1fr',
        gridTemplateAreas: `
          "sidebar header"
          "sidebar content"
        `,
        height: '100vh', // Altura fixa da viewport
        backgroundColor: theme.palette.background.default,
        overflow: 'hidden', // Previne scroll no container principal
        transition: theme.transitions.create(['grid-template-columns'], {
          easing: theme.transitions.easing.easeInOut,
          duration: 150, // Sincronizado com a sidebar
        }),
      }}
    >
      {/* Header - estilo Gmail */}
      <Box
        sx={{
          gridArea: 'header',
          backgroundColor: theme.palette.background.default,
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 64,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Botão de toggle no header - estilo Gmail */}
          <IconButton
            onClick={handleSidebarToggle}
            sx={{
              color: theme.palette.text.secondary,
              width: 40,
              height: 40,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              fontWeight: 500,
              color: theme.palette.text.primary,
              fontSize: '1.1rem',
            }}
          >
            CRM Personal Trainer
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            onClick={handleProfileMenuOpen}
            sx={{
              p: 0.5,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <Avatar sx={{ width: 36, height: 36 }}>
              <AccountCircle />
            </Avatar>
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            sx={{
              '& .MuiPaper-root': {
                borderRadius: 2,
                mt: 1,
                minWidth: 180,
                boxShadow: theme.shadows[3],
                border: `1px solid ${theme.palette.divider}`,
              },
            }}
          >
            <MenuItem 
              onClick={handleProfileMenuClose}
              sx={{ py: 1.5, px: 2 }}
            >
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Perfil" />
            </MenuItem>
            <MenuItem 
              onClick={handleLogout}
              sx={{ py: 1.5, px: 2 }}
            >
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Sair" />
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Sidebar Expansível */}
      <Box
        sx={{
          gridArea: 'sidebar',
          backgroundColor: theme.palette.background.default,
          display: 'flex',
          flexDirection: 'column',
          width: currentDrawerWidth,
          transition: theme.transitions.create(['width'], {
            easing: theme.transitions.easing.easeInOut,
            duration: 150,
          }),
          overflow: 'hidden', // Evita glitches durante a animação
        }}
      >
        {drawer}
      </Box>

      {/* Conteúdo Principal com efeito visual */}
      <Box
        sx={{
          gridArea: 'content',
          p: 2,
          pb: 3, // Margem inferior para dar o efeito flutuante
          display: 'flex',
          flexDirection: 'column',
          height: '100%', // Usa toda a altura disponível
          overflow: 'hidden', // O content area não rola
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.easeInOut,
            duration: 150,
          }),
        }}
      >
        <Box
          sx={{
            backgroundColor: 'white',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            height: '100%', // Usa toda a altura disponível do content area
            overflow: 'hidden', // O card em si não rola
          }}
        >
          <Box
            sx={{
              p: 4,
              pt: 3,
              flex: 1,
              height: '100%', // Garante que use toda a altura do card
              overflow: 'auto', // Só o conteúdo interno rola
              minHeight: 0, // Permite que o flexbox funcione corretamente
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}