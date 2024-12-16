const OpenAI = require('openai');
const { ipcMain } = require('electron');
const log = require('electron-log');
const isDev = process.env.NODE_ENV === 'development';
const Store = require('electron-store');
const store = new Store();
require('dotenv').config();
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
const os = require('os');

class AIService {
    constructor() {
        this.client = null;
        this.groqClient = null;
        this.modelName = null;
        this.currentApiKey = null;
        this.isInitialized = false;
        this.initializationError = null;
        this.initializationPromise = null;

        // Register IPC handlers first
        this.registerIpcHandlers();
    }

    registerIpcHandlers() {
        // Remove any existing handlers first
        ipcMain.removeHandler('ai:processText');
        ipcMain.removeHandler('ai:testConnection');
        ipcMain.removeHandler('ai:transcribeAudio');

        // Register handlers
        ipcMain.handle('ai:processText', async (event, data) => {
            try {
                return await this.processText(data);
            } catch (error) {
                log.error('Error in ai:processText:', error);
                throw error;
            }
        });

        ipcMain.handle('ai:testConnection', async (event, config) => {
            try {
                return await this.testConnection(config);
            } catch (error) {
                log.error('Error in ai:testConnection:', error);
                throw error;
            }
        });

        ipcMain.handle('ai:transcribeAudio', async (event, { audio, language, model }) => {
            try {
                return await this.transcribeAudio(audio, language);
            } catch (error) {
                log.error('Error in ai:transcribeAudio:', error);
                throw error;
            }
        });
    }

    async ensureInitialized() {
        try {
            const config = await this.getCurrentConfig();
            
            // If already initialized with same config, return
            if (this.isInitialized && this.currentApiKey === config.apiKey) {
                return;
            }

            log.info('Initializing AI Service with config:', {
                hasApiKey: !!config.apiKey,
                hasBaseURL: !!config.baseURL,
                hasModelName: !!config.modelName,
                hasASRModel: !!config.asrModel
            });

            if (!config.apiKey) {
                throw new Error('API key not configured for ASR service');
            }

            // Initialize OpenAI client
            this.client = new OpenAI({
                baseURL: config.baseURL,
                apiKey: config.apiKey,
            });

            // Initialize Groq client
            this.groqClient = new Groq({
                apiKey: config.apiKey
            });

            this.modelName = config.modelName;
            this.currentApiKey = config.apiKey;
            this.isInitialized = true;
            this.initializationError = null;

            log.info('AI Service initialized successfully');
        } catch (error) {
            log.error('Failed to initialize AI Service:', error);
            this.isInitialized = false;
            this.initializationError = error;
            throw error;
        }
    }

    async getCurrentConfig() {
        try {
            // Get the raw config using the same path as preferences
            const apiKey = store.get('aiService.apiKey');
            const baseURL = store.get('aiService.baseURL');
            const modelName = store.get('aiService.modelName');
            const asrModel = store.get('aiService.asrModel');

            // Log the raw values for debugging
            log.info('Raw config values:', {
                hasApiKey: !!apiKey,
                hasBaseURL: !!baseURL,
                hasModelName: !!modelName,
                hasASRModel: !!asrModel
            });

            // If no values found, try getting the full aiService object
            if (!apiKey) {
                const fullConfig = store.get('aiService');
                log.info('Fallback config:', fullConfig);
                
                if (fullConfig && fullConfig.apiKey) {
                    return fullConfig;
                }
            }

            return {
                baseURL: baseURL || 'https://api.studio.nebius.ai/v1/',
                apiKey: apiKey || '',
                modelName: modelName || 'Qwen/Qwen2.5-72B-Instruct-fast',
                asrModel: asrModel || ''
            };
        } catch (error) {
            log.error('Error getting config:', error);
            throw error;
        }
    }

    cleanJsonResponse(text) {
        log.info('Raw API response:', text);
        
        // Try to find JSON in the response that matches our task format
        const jsonMatches = text.match(/\{[\s\S]*"title"[\s\S]*"description"[\s\S]*"priority"[\s\S]*\}/);
        if (!jsonMatches) {
            // Try to find error JSON format
            const errorMatch = text.match(/\{[\s\S]*"error"[\s\S]*"reason"[\s\S]*\}/);
            if (errorMatch) {
                const errorJson = JSON.parse(errorMatch[0]);
                throw new Error(errorJson.reason || errorJson.error);
            }
            
            log.info('No valid task JSON found in response');
            throw new Error('Unable to create task from the voice input. Please try again with a clearer task description.');
        }

        const jsonText = jsonMatches[0];
        log.info('Extracted task JSON:', jsonText);
        
        try {
            const parsed = JSON.parse(jsonText);
            
            // Validate required task fields
            if (!parsed.title || typeof parsed.title !== 'string') {
                throw new Error('Invalid task: missing or invalid title');
            }
            if (!parsed.description || typeof parsed.description !== 'string') {
                throw new Error('Invalid task: missing or invalid description');
            }
            if (!parsed.priority || !['low', 'medium', 'high'].includes(parsed.priority.toLowerCase())) {
                throw new Error('Invalid task: invalid priority level');
            }
            
            return parsed;
        } catch (error) {
            log.error('Error parsing task JSON:', error);
            throw new Error('Unable to create task from the voice input. Please try again with a clearer task description.');
        }
    }

    async processText({ text, language = 'en' }) {
        if (!this.isInitialized) {
            throw new Error('AI service not initialized');
        }

        try {
            // Get user's timezone
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const now = new Date();
            const tzOffset = -now.getTimezoneOffset(); // Note: getTimezoneOffset() returns the opposite of what we want

            log.info('Processing text input: ', text);
            log.info('Language:', language);
            log.info('Timezone info:', {
                localTime: now.toLocaleString(),
                localISOTime: now.toISOString(),
                tzOffset,
                userTimezone
            });

            // Prepare the system message
            const systemMessage = this.getSystemMessage(language);
            log.info('System message:', systemMessage);
            const completion = await this.client.chat.completions.create({
                model: this.modelName,
                messages: [
                    { role: "system", content: systemMessage },
                    { role: "user", content: text }
                ],
                temperature: 0.7,
            });

            const result = completion.choices[0]?.message?.content;
            if (!result) {
                throw new Error('No response from AI service');
            }

            log.info('Raw API response:', result);

            // Parse the result
            let parsedResult;
            try {
                parsedResult = JSON.parse(result);
            } catch (error) {
                log.error('Error parsing AI response:', error);
                throw new Error('Invalid response format from AI service');
            }

            log.info('Extracted task JSON:', parsedResult);

            if (!parsedResult.title) {
                throw new Error(parsedResult.reason || parsedResult.error);
            }

            // Process the due date to ensure correct timezone
            if (parsedResult.dueDate) {
                // Parse the local time string into components
                const [datePart, timePart] = parsedResult.dueDate.split('T');
                const [year, month, day] = datePart.split('-').map(Number);
                const [hours, minutes] = timePart.split(':').map(Number);
                
                // Create date in local time
                const localDate = new Date(year, month - 1, day, hours, minutes);
                
                // Log timezone debugging information
                log.info('Date processing:', {
                    original: parsedResult.dueDate,
                    localDate: localDate.toLocaleString(),
                    utcDate: localDate.toISOString(),
                    tzOffset,
                    userTimezone
                });
                
                // Store the UTC time
                parsedResult.dueDate = localDate.toISOString();
            }

            const finalResult = {
                title: parsedResult.title || 'Untitled Task',
                description: parsedResult.description || '',
                dueDate: parsedResult.dueDate,
                priority: ['high', 'medium', 'low'].includes(parsedResult.priority?.toLowerCase()) 
                    ? parsedResult.priority.toLowerCase() 
                    : 'medium',
                metadata: {
                    confidence: completion.choices[0].finish_reason === 'stop' ? 0.9 : 0.6,
                    originalText: text,
                    language: language,
                    ...parsedResult.metadata
                }
            };
            log.info('Final processed result:', JSON.stringify(finalResult, null, 2));
            return finalResult;

        } catch (error) {
            log.error('Error in processText:', error);
            if (error.response?.status === 401) {
                throw new Error('AI service authentication failed. Please check your API key in Settings.');
            }
            throw error;
        }
    }

    getSystemMessage(language) {
        return `You are a multilingual task extraction assistant. Extract task information from user input and return it in JSON format.
        Current local time: ${new Date().toLocaleString()}
        
        Return ONLY JSON in this format, with no additional text:
        {
            "title": "Task title",
            "description": "Task description",
            "dueDate": "ISO date string in local time",
            "priority": "low|medium|high",
            "metadata": {
                "confidence": 0.0-1.0,
                "language": "detected language code"
            }
        }
        
        If the input is unclear or cannot be converted to a task, return this JSON:
        {
            "error": "Unable to create task from input",
            "reason": "Brief explanation why in user-friendly language"
        }
        
        Follow these rules:
        - Title should be actionable and natural in the target language
        - Description should include context and details not in the title
        - When processing dates and times, use the current local time shown above
        - Set dueDate based on the local time, not UTC
        - Infer priority from urgency words and context in the given language`;
    }

    async testConnection(testConfig) {
        try {
            log.info('Testing connection with config:', {
                hasApiKey: !!testConfig.apiKey,
                baseURL: testConfig.baseURL,
                modelName: testConfig.modelName
            });

            if (!testConfig.apiKey) {
                throw new Error('API key not configured for ASR service');
            }

            // Create a temporary OpenAI client with the test config
            const testClient = new OpenAI({
                baseURL: testConfig.baseURL,
                apiKey: testConfig.apiKey,
            });

            const completion = await testClient.chat.completions.create({
                temperature: 0.7,
                max_tokens: 10,
                model: testConfig.modelName,
                messages: [
                    {
                        role: "user",
                        content: "Say 'ok' if you can hear me"
                    }
                ]
            });

            if (completion.choices[0]?.message?.content) {
                // If test successful, update the store with the new config
                store.set('aiService.apiKey', testConfig.apiKey);
                store.set('aiService.baseURL', testConfig.baseURL);
                store.set('aiService.modelName', testConfig.modelName);
                store.set('aiService.asrModel', testConfig.asrModel);
                
                await this.ensureInitialized();
                return { success: true };
            } else {
                throw new Error('Invalid response from AI service');
            }
        } catch (error) {
            log.error('Error in testConnection:', error);
            throw error;
        }
    }

    async transcribeAudio(audioData, language) {
        try {
            await this.ensureInitialized();
            
            if (!this.groqClient) {
                throw new Error('Groq client not initialized');
            }

            const tempDir = os.tmpdir();
            const tempFile = path.join(tempDir, `temp-${Date.now()}.wav`);
            const buffer = Buffer.from(audioData);
            await fs.promises.writeFile(tempFile, buffer);

            log.info('Starting transcription with Groq');
            const transcription = await this.groqClient.audio.transcriptions.create({
                file: fs.createReadStream(tempFile),
                model: "whisper-large-v3",
                language: language,
                response_format: "text"
            });

            await fs.promises.unlink(tempFile);

            if (!transcription || (!transcription.text && typeof transcription !== 'string')) {
                throw new Error('No transcription result received from ASR service');
            }

            return transcription.text || transcription;

        } catch (error) {
            log.error('Error in transcribeAudio:', error);
            throw error;
        }
    }
}

// Create and export a single instance
const aiService = new AIService();
module.exports = aiService;
