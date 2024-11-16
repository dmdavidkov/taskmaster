import React, { useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import MenuItem from '@mui/material/MenuItem';
import { DateTimePicker } from '@mui/x-date-pickers';
import { motion, AnimatePresence } from 'framer-motion';
import Typography from '@mui/material/Typography';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  width: '100%',
  maxWidth: 600,
  position: 'relative',
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[10],
  '& .close-button': {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
  },
}));

const priorities = [
  { value: 'low', label: 'Low Priority', color: 'success.main' },
  { value: 'medium', label: 'Medium Priority', color: 'warning.main' },
  { value: 'high', label: 'High Priority', color: 'error.main' },
];

const TaskForm = ({ 
  task = null, 
  onSubmit, 
  onClose, 
  onDelete 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: null,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
      });
    }
  }, [task]);

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleDateChange = (newValue) => {
    setFormData(prev => ({
      ...prev,
      dueDate: newValue
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const taskData = {
      ...formData,
      dueDate: formData.dueDate ? formData.dueDate.toISOString() : null,
    };

    if (task) {
      taskData.id = task.id;
      taskData.completed = task.completed;
      taskData.completedAt = task.completedAt;
    }

    onSubmit(taskData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <StyledPaper elevation={3}>
        <IconButton 
          className="close-button"
          onClick={onClose}
          size="small"
        >
          <CloseIcon />
        </IconButton>

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h5">
              {task ? 'Edit Task' : 'New Task'}
            </Typography>

            <TextField
              label="Title"
              value={formData.title}
              onChange={handleChange('title')}
              error={!!errors.title}
              helperText={errors.title}
              fullWidth
              required
              autoFocus
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={handleChange('description')}
              error={!!errors.description}
              helperText={errors.description}
              multiline
              rows={4}
              fullWidth
            />

            <TextField
              select
              label="Priority"
              value={formData.priority}
              onChange={handleChange('priority')}
              fullWidth
            >
              {priorities.map((option) => (
                <MenuItem 
                  key={option.value} 
                  value={option.value}
                  sx={{ color: option.color }}
                >
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <DateTimePicker
              label="Due Date"
              value={formData.dueDate}
              onChange={handleDateChange}
              renderInput={(params) => <TextField {...params} fullWidth />}
              minDate={new Date()}
              clearable
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
              {task && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => onDelete(task.id)}
                >
                  Delete
                </Button>
              )}
              <Button
                variant="contained"
                type="submit"
                color="primary"
              >
                {task ? 'Save Changes' : 'Create Task'}
              </Button>
            </Box>
          </Box>
        </form>
      </StyledPaper>
    </motion.div>
  );
};

export default TaskForm;
