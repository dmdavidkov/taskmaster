import React from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import MinimizeIcon from '@mui/icons-material/Remove';
import MaximizeIcon from '@mui/icons-material/CropSquare';
import CloseIcon from '@mui/icons-material/Close';
const { ipcRenderer } = window.require('electron');

const TitleBar = () => {
  const handleWindowControl = (command) => {
    ipcRenderer.invoke('window-controls', command);
  };

  return (
    <Box
      sx={{
        WebkitAppRegion: 'drag',
        height: '32px',
        backgroundColor: 'background.paper',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        px: 1,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ WebkitAppRegion: 'no-drag' }}>
        <IconButton
          size="small"
          onClick={() => handleWindowControl('minimize')}
          sx={{ 
            width: 28, 
            height: 28,
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
            width: 28, 
            height: 28,
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
            width: 28, 
            height: 28,
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
