import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import CircularProgress from '@mui/material/CircularProgress';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(2),
  '& .content': {
    flexGrow: 1,
    minWidth: 0,
  },
  '& .actions': {
    display: 'flex',
    flexShrink: 0,
  },
}));

const TaskList = ({ 
  tasks, 
  loading, 
  onSelectTask, 
  onDeleteTask, 
  onToggleComplete,
  onSearch,
  searchQuery
}) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'success';
    }
  };

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3,
        gap: 2,
        flexWrap: 'wrap'
      }}>
        <Typography variant="h4">Tasks</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => onSelectTask(null)}
          sx={{ borderRadius: 2 }}
        >
          Add New Task
        </Button>
      </Box>
      
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search tasks..."
        value={searchQuery}
        onChange={(e) => onSearch(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              layout
            >
              <StyledPaper 
                elevation={2}
                sx={{
                  opacity: task.completed ? 0.7 : 1,
                  transition: 'opacity 0.2s ease-in-out',
                }}
              >
                <IconButton
                  onClick={() => onToggleComplete(task.id)}
                  size="small"
                  color="primary"
                  sx={{ mt: 0.5 }}
                >
                  {task.completed ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
                </IconButton>
                
                <Box className="content">
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      wordBreak: 'break-word',
                      textDecoration: task.completed ? 'line-through' : 'none',
                    }}
                  >
                    {task.title}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                      mb: 1,
                      textDecoration: task.completed ? 'line-through' : 'none',
                    }}
                  >
                    {task.description}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={task.priority}
                      size="small"
                      color={getPriorityColor(task.priority)}
                      sx={{ mr: 1 }}
                    />
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
                        color="success"
                        variant="outlined"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                </Box>
                <Box className="actions">
                  <IconButton
                    onClick={() => onSelectTask(task)}
                    size="small"
                    sx={{ mr: 1 }}
                    aria-label="edit task"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => onDeleteTask(task.id)}
                    size="small"
                    color="error"
                    aria-label="delete task"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </StyledPaper>
            </motion.div>
          ))}
          {tasks.length === 0 && (
            <Typography variant="body1" color="text.secondary" align="center">
              No tasks found. {searchQuery ? 'Try a different search term.' : 'Click the + button to create one!'}
            </Typography>
          )}
        </>
      )}
    </Box>
  );
};

export default TaskList;
