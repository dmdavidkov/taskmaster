// Environment variables configuration
const getEnvVariable = (key) => {
    const isDev = window?.electron?.env?.NODE_ENV === 'development';
    let value;

    if (isDev) {
        // In development, use environment variables
        value = window?.electron?.env?.[key];
    } else {
        // In production, use electron store
        if (key === 'REACT_APP_NEBIUS_API_KEY') {
            value = window?.electron?.preferences?.get('apiKey');
        }
    }
    
    if (!value) {
        console.warn(`Configuration value for ${key} not found`);
    }
    return value;
};

// Configuration object
export const config = {
    NEBIUS_API_KEY: getEnvVariable('REACT_APP_NEBIUS_API_KEY'),
    API_BASE_URL: 'https://api.studio.nebius.ai/v1/',
    isDevelopment: window?.electron?.env?.NODE_ENV === 'development',
};

// Validate required configuration
const validateConfig = () => {
    const required = ['NEBIUS_API_KEY'];
    const missing = required.filter(key => !config[key]);
    
    if (missing.length > 0) {
        if (config.isDevelopment) {
            console.error('Development environment detected. Make sure your .env file is properly configured.');
        } else {
            console.error('Please configure the API key in the application settings.');
        }
    }
};

validateConfig();
