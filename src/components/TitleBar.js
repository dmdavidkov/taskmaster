import React from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import MinimizeIcon from '@mui/icons-material/Remove';
import MaximizeIcon from '@mui/icons-material/CropSquare';
import CloseIcon from '@mui/icons-material/Close';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { alpha } from '@mui/material/styles';

const TitleBar = ({ darkMode, onThemeToggle }) => {
  const handleWindowControl = (command) => {
    window.electron.window[command]();
  };

  return (
    <Box
      sx={{
        WebkitAppRegion: 'drag',
        height: '32px',
        backgroundColor: 'background.paper',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pl: 2,
        pr: 1,
        borderBottom: 1,
        borderColor: (theme) => alpha(theme.palette.divider, 0.1),
        position: 'relative',
        zIndex: 1100,
      }}
    >
      <Typography
        variant="subtitle2"
        component="div"
        sx={{
          fontWeight: 500,
          color: 'text.secondary',
          fontSize: '0.75rem',
        }}
      >
        TaskMaster
      </Typography>

      <Box sx={{ 
        WebkitAppRegion: 'no-drag',
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
      }}>
        <IconButton
          size="small"
          onClick={onThemeToggle}
          sx={{ 
            fontSize: '1rem',
            '&:hover': {
              backgroundColor: 'action.hover',
            }
          }}
        >
          {darkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
        </IconButton>

        <IconButton
          size="small"
          onClick={() => handleWindowControl('minimize')}
          sx={{
            fontSize: '1rem',
            '&:hover': {
              backgroundColor: 'action.hover',
            }
          }}
        >
          <MinimizeIcon fontSize="small" />
        </IconButton>

        <IconButton
          size="small"
          onClick={() => handleWindowControl('maximize')}
          sx={{
            fontSize: '1rem',
            '&:hover': {
              backgroundColor: 'action.hover',
            }
          }}
        >
          <MaximizeIcon fontSize="small" />
        </IconButton>

        <IconButton
          size="small"
          onClick={() => handleWindowControl('close')}
          sx={{
            fontSize: '1rem',
            '&:hover': {
              backgroundColor: 'error.main',
              color: 'error.contrastText',
            }
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default TitleBar;
