import React from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import TodayIcon from '@mui/icons-material/Today';
import UpcomingIcon from '@mui/icons-material/Upcoming';
import FlagIcon from '@mui/icons-material/Flag';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

const drawerWidth = 240;

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: 240,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: 240,
    boxSizing: 'border-box',
    backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
    overflowX: 'hidden',
    height: 'calc(100% - 30px)',
    top: '30px',
    border: 'none',
    borderRight: `1px solid ${theme.palette.divider}`,
  },
}));

const Sidebar = ({ darkMode, setDarkMode, selectedTab, setSelectedTab }) => {
  const menuItems = [
    { id: 'all', text: 'All Tasks', icon: <AllInboxIcon /> },
    { id: 'today', text: 'Today', icon: <TodayIcon /> },
    { id: 'upcoming', text: 'Upcoming', icon: <UpcomingIcon /> },
    { id: 'priority', text: 'Priority', icon: <FlagIcon /> },
    { id: 'completed', text: 'Completed', icon: <DoneAllIcon /> },
  ];

  return (
    <StyledDrawer variant="permanent" anchor="left">
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="div">
          TaskMaster
        </Typography>
        <IconButton onClick={() => setDarkMode(!darkMode)} size="small">
          {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Box>
      <Divider />
      <List sx={{ mt: 1 }}>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.id}
            selected={selectedTab === item.id}
            onClick={() => setSelectedTab(item.id)}
            sx={{
              my: 0.5,
              mx: 1,
              borderRadius: 2,
              '&.Mui-selected': {
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.08)',
              },
              '&:hover': {
                backgroundColor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(0, 0, 0, 0.12)',
              },
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </StyledDrawer>
  );
};

export default Sidebar;
