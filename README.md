# TaskMaster - Modern Task Management Application

A beautiful and responsive task management application built with Electron and React. TaskMaster helps you organize your work and life with a clean, modern interface and powerful features.

![TaskMaster Screenshot](assets/Screenshot.png)

## Getting Started

### Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Update the `.env` file with your settings:
   - `REACT_APP_NEBIUS_API_KEY`: Your Nebius API key for AI task processing
   - Other settings can be left as default for development

> **Note**: The `.env` file contains sensitive information and is not tracked in version control. Make sure to keep your API keys secure.

## Features

- Create, edit, and delete tasks
- Set due dates and priorities
- Organize tasks with categories
- Search and filter tasks
- Dark/light mode support
- Beautiful, modern UI with animations
- Local data persistence
- Responsive design
- Fast and efficient
- Auto-updates support
- Voice-to-Text with Whisper AI model

## Voice-to-Text with Whisper

TaskMaster integrates the Whisper large-v3-turbo model for powerful voice-to-text capabilities. This feature allows you to dictate your tasks using your voice, making task creation faster and more convenient.

### Setting Up Voice Input

1. Go to Settings (bottom left corner)
2. Navigate to the "Voice Input" tab
3. Under "Whisper Configuration", you can:
   - Select your preferred model version 
   > whisper-large-v3-turbo is the best choice, but you can try smaller for faster processing
   - Configure model parameters (keep on default for now)
   - Choose your preferred language
4. Click "Initialize Model" to load the Whisper model
   > Note: Initial model loading may take a few moments depending on your internet connection
5. Click "Test Speech Recognition" to test the voice-to-text functionality
   > If the model is loaded and the test works, you can now use voice input to create tasks

### Using Voice Input

1. When creating or editing a task, look for the microphone icon (🎤) next to text fields
2. Click the microphone icon to start recording
3. Speak clearly into your microphone
4. Click the stop icon (⏹️) to end recording
5. The Whisper model will process your speech and convert it to text
6. Review and edit the transcribed text if needed

### Performance Considerations

- The model runs locally in your browser using WebGPU acceleration
- First-time initialization requires downloading the model
- Transcription works offline once the model is loaded
- Processing time varies based on the length of the recording and the hardware capabilities of your device

## Installation

### For Users

1. Download the latest installer from the [Releases](../../releases) page
2. Run the installer (`TaskMaster Setup.exe`)
3. Follow the installation wizard
4. Launch TaskMaster from your desktop or start menu

### For Developers

1. Clone the repository:
```bash
git clone https://github.com/dmdavidkov/taskmaster.git
cd taskmaster
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Build

### Development Build
```bash
npm run build
```

### Create Windows Portable Version
```bash
npm run make-win
```

### Create Windows Installer
```bash
npm run make-installer
```

## Tech Stack

- Frontend Framework: React 18
- Desktop Framework: Electron 25
- UI Components: Material-UI v5 with Icons and Date Pickers
- State Management: React Context API
- Animations: Framer Motion
- Date Handling: Date-fns
- Data Storage: Electron Store
- Logging: Electron Log
- Auto Updates: Electron Updater
- Build Tools: Electron Builder, Craco
- Unique IDs: UUID

## Project Structure

```
taskmaster/
├── src/               # React application source
│   ├── components/    # React components
│   ├── hooks/        # Custom React hooks
│   ├── App.js        # Main React component
│   └── index.js      # React entry point
├── electron/         # Electron main process files
├── assets/          # Application assets
├── public/          # Static files
└── scripts/         # Build and utility scripts
```

## Development

1. Start the application in development mode:
```bash
npm run dev
```

2. The application will start with hot reload enabled
3. Edit files in `src/` to see changes in real-time
4. Main process changes require application restart

## Distribution

The application can be distributed in several formats:

- Windows Installer: Created using `npm run make-installer`
- Portable Version: Created using `npm run make-win`
- Development Build: Created using `npm run build`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Electron](https://www.electronjs.org/)
- [React](https://reactjs.org/)
- [Material-UI](https://mui.com/)
- [Framer Motion](https://www.framer.com/motion/)

---

Made with by Dimitar Davidkov
