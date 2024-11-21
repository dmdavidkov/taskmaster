import React, { useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import MinimizeIcon from '@mui/icons-material/Remove';
import MaximizeIcon from '@mui/icons-material/CropSquare';
import CloseIcon from '@mui/icons-material/Close';
import PaletteIcon from '@mui/icons-material/Palette';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import { alpha } from '@mui/material/styles';
import useThemeStore from '../stores/themeStore';

const TitleBar = () => {
  const { theme, isDarkMode, setTheme, availableThemes } = useThemeStore();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleWindowControl = (command) => {
    window.electron.window[command]();
  };

  const handleThemeMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleThemeMenuClose = () => {
    setAnchorEl(null);
  };

  const handleThemeSelect = (themeId) => {
    setTheme(themeId);
    handleThemeMenuClose();
  };

  return (
    <Box
      sx={{
        WebkitAppRegion: 'drag',
        height: '32px',
        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.7),
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        TaskMaster
      </Typography>

      <Box sx={{ 
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        WebkitAppRegion: 'no-drag',
      }}>
        <IconButton
          size="small"
          onClick={handleThemeMenuOpen}
          sx={{ 
            fontSize: '1.2rem',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <PaletteIcon fontSize="inherit" />
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleThemeMenuClose}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 180,
            }
          }}
        >
          <MenuItem 
            selected={theme === 'system'}
            onClick={() => handleThemeSelect('system')}
          >
            <ListItemIcon>
              {isDarkMode ? <Brightness4Icon /> : <Brightness7Icon />}
            </ListItemIcon>
            <ListItemText>System</ListItemText>
          </MenuItem>
          {availableThemes.map(({ id, name }) => (
            <MenuItem
              key={id}
              selected={theme === id}
              onClick={() => handleThemeSelect(id)}
            >
              <ListItemIcon>
                <PaletteIcon />
              </ListItemIcon>
              <ListItemText>{name}</ListItemText>
            </MenuItem>
          ))}
        </Menu>

        <IconButton
          size="small"
          onClick={() => handleWindowControl('minimize')}
          sx={{ 
            fontSize: '1.2rem',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <MinimizeIcon fontSize="inherit" />
        </IconButton>

        <IconButton
          size="small"
          onClick={() => handleWindowControl('maximize')}
          sx={{ 
            fontSize: '1.2rem',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <MaximizeIcon fontSize="inherit" />
        </IconButton>

        <IconButton
          size="small"
          onClick={() => handleWindowControl('close')}
          sx={{ 
            fontSize: '1.2rem',
            '&:hover': {
              backgroundColor: 'error.main',
              color: 'error.contrastText',
            },
          }}
        >
          <CloseIcon fontSize="inherit" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default TitleBar;
