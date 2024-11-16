import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isFuture, parseISO, startOfDay, endOfDay, isWithinInterval, addDays } from 'date-fns';
import CircularProgress from '@mui/material/CircularProgress';
import { styled } from '@mui/material/styles';
import Chip from '@mui/material/Chip';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(2),
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateX(5px)',
    boxShadow: theme.shadows[4],
  },
  '& .content': {
    flexGrow: 1,
    minWidth: 0,
  },
  '& .actions': {
    display: 'flex',
    flexShrink: 0,
    gap: theme.spacing(1),
  },
}));

const TaskList = ({ 
  tasks = [], 
  loading = false, 
  selectedTab = 'all',
  searchQuery = '',
  sortBy = 'dueDate',
  onTaskClick,
  onTaskToggle,
  onTaskDelete 
}) => {
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    // First filter tasks
    let filtered = tasks.filter(task => {
      const taskTitle = task?.title || '';
      const taskDescription = task?.description || '';
      const matchesSearch = taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        taskDescription.toLowerCase().includes(searchQuery.toLowerCase());
      
      switch (selectedTab) {
        case 'all':
          return !task.completed && matchesSearch;
        case 'active':
          return !task.completed && matchesSearch;
        case 'completed':
          return task.completed && matchesSearch;
        case 'today':
          return task.dueDate && isToday(parseISO(task.dueDate)) && !task.completed && matchesSearch;
        case 'upcoming':
          return task.dueDate && isFuture(parseISO(task.dueDate)) && !task.completed && matchesSearch;
        case 'priority':
          return task.priority === 'high' && !task.completed && matchesSearch;
        default:
          return matchesSearch;
      }
    });

    // Then sort tasks
    switch (sortBy) {
      case 'priority':
        return [...filtered].sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const aPriority = a?.priority || 'low';
          const bPriority = b?.priority || 'low';
          return priorityOrder[aPriority] - priorityOrder[bPriority];
        });
      case 'dueDate':
        return [...filtered].sort((a, b) => {
          if (!a?.dueDate) return 1;
          if (!b?.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        });
      case 'name':
        return [...filtered].sort((a, b) => {
          const aTitle = (a?.title || '').toLowerCase();
          const bTitle = (b?.title || '').toLowerCase();
          return aTitle.localeCompare(bTitle);
        });
      default:
        return filtered;
    }
  }, [tasks, selectedTab, searchQuery, sortBy]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (filteredAndSortedTasks.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', p: 3, color: 'text.secondary' }}>
        <Typography variant="body1">
          {searchQuery
            ? 'No tasks match your search'
            : selectedTab === 'completed'
            ? 'No completed tasks'
            : selectedTab === 'active'
            ? 'No active tasks'
            : selectedTab === 'today'
            ? 'No tasks due today'
            : selectedTab === 'upcoming'
            ? 'No upcoming tasks'
            : selectedTab === 'priority'
            ? 'No high priority tasks'
            : 'No open tasks'}
        </Typography>
      </Box>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Box
        component={motion.div}
        layout
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          p: 2,
        }}
      >
        {filteredAndSortedTasks.map((task) => (
          <motion.div
            key={task.id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <StyledPaper>
              <IconButton
                size="small"
                onClick={() => onTaskToggle(task.id)}
                color={task.completed ? 'primary' : 'default'}
              >
                {task.completed ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
              </IconButton>

              <div className="content" onClick={() => onTaskClick(task)}>
                <Typography
                  variant="h6"
                  component="h3"
                  sx={{
                    textDecoration: task.completed ? 'line-through' : 'none',
                    color: task.completed ? 'text.secondary' : 'text.primary',
                  }}
                >
                  {task?.title || 'Untitled Task'}
                </Typography>

                {task?.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      textDecoration: task.completed ? 'line-through' : 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {task.description}
                  </Typography>
                )}

                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {task.priority && (
                    <Chip
                      label={task.priority}
                      size="small"
                      color={getPriorityColor(task.priority)}
                    />
                  )}
                  {task.dueDate && (
                    <Chip
                      label={format(new Date(task.dueDate), 'MMM d, yyyy')}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {task.completed && (
                    <Chip
                      label={`Completed ${format(new Date(task.completedAt), 'MMM d, yyyy')}`}
                      size="small"
                      color="primary"
                    />
                  )}
                </Box>
              </div>

              <div className="actions">
                <IconButton
                  size="small"
                  onClick={() => onTaskClick(task)}
                  color="primary"
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => onTaskDelete(task.id)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </div>
            </StyledPaper>
          </motion.div>
        ))}
      </Box>
    </AnimatePresence>
  );
};

export default TaskList;
