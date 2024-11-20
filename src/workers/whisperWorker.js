import {
    AutoTokenizer,
    AutoProcessor,
    WhisperForConditionalGeneration,
    full,
} from '@huggingface/transformers';

const MAX_NEW_TOKENS = 128;
const SAMPLING_RATE = 16000;

class AutomaticSpeechRecognitionPipeline {
    static model_id = 'onnx-community/whisper-large-v3-turbo';
    static tokenizer = null;
    static processor = null;
    static model = null;
    static chunk_length_s = 30;
    static stride_length_s = 5;

    static async getInstance(progress_callback = null, config = null) {
        // Reset all instances if config is provided
        if (config) {
            this.tokenizer = null;
            this.processor = null;
            this.model = null;
            this.model_id = config.model_id;
        }

        this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id, {
            progress_callback,
        });
        this.processor ??= AutoProcessor.from_pretrained(this.model_id, {
            progress_callback,
            chunk_length_s: this.chunk_length_s,
            stride_length_s: this.stride_length_s,
            sampling_rate: SAMPLING_RATE,
        });

        const modelConfig = config || {
            encoder_model: 'q4',
            decoder_model_merged: 'q4',
            model_id: this.model_id
        };

        // Try WebGPU first, fallback to CPU if not available
        if (!this.model) {
            try {
                this.model = await WhisperForConditionalGeneration.from_pretrained(modelConfig.model_id, {
                    dtype: {
                        encoder_model: modelConfig.encoder_model,
                        decoder_model_merged: modelConfig.decoder_model_merged,
                    },
                    device: 'webgpu',
                    progress_callback,
                });
            } catch (error) {
                console.log('WebGPU not available, falling back to CPU');
                this.model = await WhisperForConditionalGeneration.from_pretrained(modelConfig.model_id, {
                    dtype: {
                        encoder_model: 'fp32',
                        decoder_model_merged: 'fp32',
                    },
                    device: 'wasm',
                    progress_callback,
                });
            }
        }

        return Promise.all([this.tokenizer, this.processor, this.model]);
    }

    static reset() {
        this.tokenizer = null;
        this.processor = null;
        this.model = null;
        this.model_id = 'onnx-community/whisper-large-v3-turbo';
    }
}

let processing = false;
let pipeline = null;

async function transcribe(audio, language, config) {
    if (processing) return;
    processing = true;

    try {
        const [tokenizer, processor, model] = await AutomaticSpeechRecognitionPipeline.getInstance(null, config);

        // Process audio through the processor
        const inputs = await processor(audio, {
            sampling_rate: SAMPLING_RATE,
            return_tensors: true
        });

        const outputs = await model.generate({
            ...inputs,
            max_new_tokens: MAX_NEW_TOKENS,
            language: language,
            task: 'transcribe',
            return_timestamps: false,
        });

        const text = tokenizer.batch_decode(outputs, { 
            skip_special_tokens: true,
        })[0];

        self.postMessage({
            status: 'complete',
            text
        });
    } catch (error) {
        console.error('Transcription error:', error);
        self.postMessage({
            status: 'error',
            error: error.message
        });
        throw error;
    } finally {
        processing = false;
    }
}

async function load(config) {
    try {
        let currentStage = 'downloading';
        let lastProgressTime = {};
        let hasProgress = false;
        let isFirstProgress = true;
        
        const progress_callback = (progress) => {
            if (typeof progress === 'object') {
                const { file, loaded, total } = progress;
                
                // Only report if we have actual data and it's a real download
                if (total > 0) {
                    // Check if this is the first progress event
                    if (isFirstProgress) {
                        isFirstProgress = false;
                        // If loaded is already equal to total on first progress,
                        // it's likely reading from cache
                        if (loaded === total) {
                            return;
                        }
                    }
                    
                    hasProgress = true;
                    const now = Date.now();
                    if (now - (lastProgressTime[file] || 0) < 100) {
                        return;
                    }
                    lastProgressTime[file] = now;

                    const percentage = (loaded / total) * 100;
                    self.postMessage({ 
                        status: 'progress', 
                        progress: percentage,
                        stage: 'downloading',
                        file: file.split('/').pop(),
                        total,
                        loaded,
                        cached: false
                    });
                }
            } else {
                self.postMessage({ 
                    status: 'progress', 
                    progress: Math.round(progress),
                    stage: currentStage,
                    cached: !hasProgress
                });
            }
        };

        // Reset pipeline only if we don't have one or if config is provided
        if (!pipeline || config) {
            pipeline = null;
            
            // Start initialization
            console.log('Starting model initialization');
            self.postMessage({ 
                status: 'progress', 
                progress: 0, 
                stage: 'downloading',
                cached: true
            });

            try {
                const [tokenizer, processor, model] = await AutomaticSpeechRecognitionPipeline.getInstance(progress_callback, config);

                // If we got any real progress events, it wasn't cached
                if (hasProgress) {
                    console.log('Model downloaded');
                } else {
                    console.log('Model loaded from cache');
                }
                
                currentStage = 'loading';
                console.log('Moving to loading stage...');
                self.postMessage({ 
                    status: 'progress', 
                    progress: 0, 
                    stage: 'loading',
                    cached: !hasProgress
                });
                
                console.log('Initializing pipeline...');
                pipeline = { tokenizer, processor, model };
                
                currentStage = 'preparing';
                console.log('Preparing model for inference...');
                self.postMessage({ 
                    status: 'progress', 
                    progress: 0, 
                    stage: 'preparing'
                });
                
                console.log('Model loading complete');
                self.postMessage({ status: 'ready' });
            } catch (error) {
                console.error('Error loading model:', error);
                self.postMessage({ 
                    status: 'error',
                    error: error.message
                });
                throw error;
            }
        } else {
            // If pipeline exists and no new config, just report ready
            self.postMessage({ status: 'ready' });
        }
    } catch (error) {
        console.error('Error in load():', error);
        self.postMessage({ 
            status: 'error',
            error: error.message
        });
        throw error;
    }
}

self.onmessage = async (e) => {
    const { type, audio, language, config } = e.data;

    switch (type) {
        case 'load':
            await load(config);
            break;
        case 'transcribe':
            await transcribe(audio, language, config);
            break;
    }
};
