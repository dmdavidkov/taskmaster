import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import Box from '@mui/material/Box';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import TitleBar from './components/TitleBar';
import { useTaskStore } from './hooks/useTaskStore';

const { ipcRenderer } = window.require('electron');

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    return stored ? JSON.parse(stored) : false;
  });
  
  const handleThemeChange = (isDark) => {
    setDarkMode(isDark);
    localStorage.setItem('darkMode', JSON.stringify(isDark));
  };

  const [selectedTask, setSelectedTask] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { tasks, loading, createTask, updateTask, deleteTask, toggleTaskCompletion } = useTaskStore();

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#2196f3',
      },
      secondary: {
        main: '#f50057',
      },
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
    },
  });

  const handleCreateTask = async (task) => {
    await createTask(task);
    setIsFormOpen(false);
  };

  const handleUpdateTask = async (task) => {
    await updateTask(task);
    setSelectedTask(null);
    setIsFormOpen(false);
  };

  const handleToggleComplete = async (taskId) => {
    try {
      await toggleTaskCompletion(taskId);
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(taskId);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const getFilteredTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // First filter by search query
    let filteredTasks = tasks.filter(task => {
      const searchLower = searchQuery.toLowerCase();
      return (
        !searchQuery ||
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower)
      );
    });

    // Then filter by tab
    switch (selectedTab) {
      case 'today':
        return filteredTasks.filter(task => {
          if (task.completed || !task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          taskDate.setHours(0, 0, 0, 0);
          return taskDate.getTime() === today.getTime();
        });
      case 'upcoming':
        return filteredTasks.filter(task => {
          if (task.completed || !task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          taskDate.setHours(0, 0, 0, 0);
          return taskDate.getTime() > today.getTime();
        });
      case 'priority':
        return filteredTasks.filter(task => !task.completed && task.priority === 'high');
      case 'completed':
        return filteredTasks.filter(task => task.completed);
      default:
        return filteredTasks.filter(task => !task.completed);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <CssBaseline />
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <Sidebar
            darkMode={darkMode}
            setDarkMode={handleThemeChange}
            onCreateTask={() => setIsFormOpen(true)}
            selectedTab={selectedTab}
            setSelectedTab={setSelectedTab}
          />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              height: '100vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <TitleBar />
            <Box
              sx={{
                flexGrow: 1,
                p: 3,
                backgroundColor: theme.palette.background.default,
                overflow: 'auto',
              }}
            >
              <TaskList
                tasks={getFilteredTasks()}
                loading={loading}
                onSelectTask={(task) => {
                  setSelectedTask(task);
                  setIsFormOpen(true);
                }}
                onDeleteTask={handleDeleteTask}
                onToggleComplete={handleToggleComplete}
                onSearch={setSearchQuery}
                searchQuery={searchQuery}
              />
            </Box>
          </Box>
          <AnimatePresence>
            {isFormOpen && (
              <TaskForm
                key="task-form"
                task={selectedTask}
                onSubmit={selectedTask ? handleUpdateTask : handleCreateTask}
                onClose={() => {
                  setIsFormOpen(false);
                  setSelectedTask(null);
                }}
              />
            )}
          </AnimatePresence>
        </Box>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
