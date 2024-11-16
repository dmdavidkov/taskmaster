import React, { useState, useEffect } from 'react';
import { styled, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import TodayIcon from '@mui/icons-material/Today';
import UpcomingIcon from '@mui/icons-material/Upcoming';
import FlagIcon from '@mui/icons-material/Flag';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { motion } from 'framer-motion';

const drawerWidth = 280;

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    backgroundColor: theme.palette.background.default,
    borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    height: 'calc(100% - 32px)', // TitleBar height
    top: '32px',
  },
}));

const StyledListItem = styled(ListItem)(({ theme, selected }) => ({
  borderRadius: theme.shape.borderRadius,
  margin: '4px 8px',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
  ...(selected && {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.16),
    },
  }),
}));

const SearchTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    transition: theme.transitions.create(['background-color', 'box-shadow']),
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark' 
        ? alpha(theme.palette.common.white, 0.05)
        : alpha(theme.palette.common.black, 0.03),
    },
    '&.Mui-focused': {
      backgroundColor: theme.palette.background.paper,
      boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
    },
  },
}));

const menuItems = [
  { id: 'all', text: 'Open Tasks', icon: <AllInboxIcon /> },
  { id: 'today', text: 'Today', icon: <TodayIcon /> },
  { id: 'upcoming', text: 'Upcoming', icon: <UpcomingIcon /> },
  { id: 'priority', text: 'Priority', icon: <FlagIcon /> },
  { id: 'completed', text: 'Completed', icon: <DoneAllIcon /> },
];

const Sidebar = ({ 
  selectedTab = 'all',
  searchQuery = '',
  onTabChange,
  onSearchChange,
  onAddTask,
}) => {
  const [version, setVersion] = useState('');

  useEffect(() => {
    // Get app version on component mount
    if (window.electron?.app) {
      window.electron.app.getVersion().then(setVersion).catch(console.error);
    }
  }, []);

  return (
    <StyledDrawer
      variant="permanent"
      anchor="left"
      component={motion.div}
      initial={{ x: -drawerWidth }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        p: 2,
      }}>
        <Box sx={{ mb: 3 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 2,
              fontWeight: 700,
              color: 'primary.main',
            }}
          >
            TaskMaster
          </Typography>

          <Button
            variant="contained"
            fullWidth
            startIcon={<AddIcon />}
            onClick={onAddTask}
            sx={{ mb: 2 }}
          >
            Add Task
          </Button>

          <SearchTextField
            fullWidth
            size="small"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <List component="nav">
          {menuItems.map(({ id, text, icon }) => (
            <StyledListItem
              key={id}
              button
              selected={selectedTab === id}
              onClick={() => onTabChange(id)}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {icon}
              </ListItemIcon>
              <ListItemText 
                primary={text}
                primaryTypographyProps={{
                  fontWeight: selectedTab === id ? 600 : 400,
                }}
              />
            </StyledListItem>
          ))}
        </List>

        <Box sx={{ flexGrow: 1 }} />

        <Typography 
          variant="caption" 
          color="text.secondary"
          align="center"
          sx={{ mt: 2 }}
        >
          TaskMaster v{version}
        </Typography>
      </Box>
    </StyledDrawer>
  );
};

export default Sidebar;
