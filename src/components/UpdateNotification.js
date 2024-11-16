import React, { useState, useEffect, useRef } from 'react';
import {
  Snackbar,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';

const UpdateNotification = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const updateHandled = useRef(false);

  useEffect(() => {
    if (!window.electron?.updates) return;

    const handleUpdateAvailable = (_, info) => {
      if (!updateHandled.current) {
        setUpdateAvailable(true);
        updateHandled.current = true;
      }
    };

    const handleUpdateError = (_, error) => {
      setError(error?.message || error?.toString() || 'Unknown error');
      setDownloading(false);
      updateHandled.current = false;
    };

    const handleUpdateProgress = (_, progressObj) => {
      setDownloading(true);
      setUpdateAvailable(false);
    };

    const handleUpdateDownloaded = (_, info) => {
      setDownloading(false);
      updateHandled.current = false;
    };

    // Subscribe to update events
    const updates = window.electron.updates;
    updates.onUpdateAvailable(handleUpdateAvailable);
    updates.onUpdateError(handleUpdateError);
    updates.onUpdateProgress(handleUpdateProgress);
    updates.onUpdateDownloaded?.(handleUpdateDownloaded);

    // Cleanup subscriptions
    return () => {
      if (window.electron?.updates) {
        const updates = window.electron.updates;
        updates.removeUpdateAvailable?.(handleUpdateAvailable);
        updates.removeUpdateError?.(handleUpdateError);
        updates.removeUpdateProgress?.(handleUpdateProgress);
        // Only try to remove if the function exists
        if (updates.removeUpdateDownloaded) {
          updates.removeUpdateDownloaded(handleUpdateDownloaded);
        }
      }
    };
  }, []);

  const handleDownload = async () => {
    try {
      setError(null);
      setUpdateAvailable(false);
      setDownloading(true);
      const result = await window.electron.updates.downloadUpdate();
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to download update');
      }
    } catch (err) {
      setError(err?.message || err?.toString() || 'Unknown error');
      setDownloading(false);
      setUpdateAvailable(true);
      updateHandled.current = false;
    }
  };

  const handleClose = () => {
    setUpdateAvailable(false);
    setError(null);
    updateHandled.current = true;
  };

  // Don't show anything in development mode
  if (!window.electron?.updates) return null;

  if (error) {
    return (
      <Snackbar
        open={true}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleClose} severity="error">
          {typeof error === 'string' ? error : 'Failed to update'}
        </Alert>
      </Snackbar>
    );
  }

  if (downloading) {
    return (
      <Snackbar
        open={true}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          icon={<CircularProgress size={20} />}
          severity="info"
        >
          Downloading update...
        </Alert>
      </Snackbar>
    );
  }

  if (updateAvailable) {
    return (
      <Snackbar
        open={true}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity="info"
          action={
            <>
              <Button color="primary" size="small" onClick={handleDownload}>
                Download
              </Button>
              <Button color="inherit" size="small" onClick={handleClose}>
                Later
              </Button>
            </>
          }
        >
          A new version is available
        </Alert>
      </Snackbar>
    );
  }

  return null;
};

export default UpdateNotification;
