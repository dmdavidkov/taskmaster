import React, { useRef, useEffect } from 'react';
import { Box, useTheme } from '@mui/material';

const AudioVisualizer = ({ 
  isRecording, 
  audioStream,
}) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioDataRef = useRef([]);
  const theme = useTheme();

  const BAR_WIDTH = 2;
  const BAR_GAP = 1;
  const FFT_SIZE = 1024;
  const SMOOTHING_TIME_CONSTANT = 0.6;
  const SCROLL_SPEED = 0.25;
  const MIN_BAR_HEIGHT = 6;

  const drawVisualization = (dataArray) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Get new audio data
    const barTotalWidth = BAR_WIDTH + BAR_GAP;
    const barsNeeded = Math.ceil(SCROLL_SPEED);
    const newData = [];
    for (let i = 0; i < barsNeeded; i++) {
      const frequency = i * dataArray.length / barsNeeded;
      const index = Math.floor(frequency);
      let value = dataArray[index];
      if (frequency > 2000) value *= 0.7;
      newData.push(value);
    }
    
    // Update stored audio data
    audioDataRef.current = [...audioDataRef.current, ...newData];
    // Keep only enough bars to fill the screen plus a little extra
    const maxBars = Math.ceil(width / barTotalWidth) + 10;
    if (audioDataRef.current.length > maxBars) {
      audioDataRef.current = audioDataRef.current.slice(-maxBars);
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    const maxBarHeight = height * 0.95;
    const verticalCenter = height / 2;
    
    // Draw visualization
    const primaryColor = theme.palette.primary.main;
    
    let currentX = width;
    for (let i = audioDataRef.current.length - 1; i >= 0; i--) {
      const value = audioDataRef.current[i];
      const normalizedValue = value / 256;
      const barHeight = Math.max(MIN_BAR_HEIGHT, normalizedValue * maxBarHeight);
      
      const alpha = 0.7 + (normalizedValue * 0.3);
      ctx.fillStyle = `${primaryColor}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
      
      currentX -= barTotalWidth;
      
      // Only draw if visible
      if (currentX + BAR_WIDTH >= 0 && currentX <= width) {
        ctx.fillRect(
          currentX,
          verticalCenter - barHeight / 2,
          BAR_WIDTH,
          barHeight
        );
      }
    }
  };

  useEffect(() => {
    const resizeCanvas = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => {
    if (!isRecording || !audioStream) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      audioDataRef.current = [];
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(audioStream);
      source.connect(analyser);

      const animate = () => {
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(frequencyData);
        drawVisualization(frequencyData);
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animate();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } catch (error) {
      console.error('Error setting up audio visualization:', error);
    }
  }, [isRecording, audioStream]);

  return (
    <Box 
      sx={{ 
        position: 'absolute',
        left: 0,
        right: 0,
        width: '100%',
        height: '90px',
        zIndex: 1,
        pointerEvents: 'none'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </Box>
  );
};

export default AudioVisualizer;
