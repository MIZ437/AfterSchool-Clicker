# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"AfterSchool Clicker" is a heroine-themed incremental/clicker game built with Electron. The game features anime-style heroine imagery, progressive stage unlocking, gacha collection mechanics, and reward videos. All user-facing content is in Japanese, while internal code can use English.

**Platform**: Electron desktop application with ASAR packaging for file protection

## Architecture

### Core Game Systems
- **Point System**: Click-based earning with upgrades for Click Per Point (CPP) and Points Per Second (PPS)
- **Stage Progression**: 4 sequential stages (教室→図書館→屋上→体育館) with unlock costs
- **Gacha Collection**: Point-based image collection system (no duplicates, 9 images for stage 1)
- **Album System**: Gallery for viewing collected images and reward videos, organized by stage
- **Shop System**: Upgrades for click efficiency and automatic point generation

### Technical Stack
- **Main Process**: `src/main.js` - Electron backend with secure IPC, file system access, save data management
- **Renderer Process**: `src/index.html` + `src/preload.js` - Game UI with context isolation enabled
- **Asset Management**: CSV-based configuration in `assets/data/` for easy content updates
- **Save Data**: Stored in Electron's userData directory (not localStorage)

### File Structure
```
src/
├── main.js          # Electron main process
├── preload.js       # Secure IPC bridge
├── index.html       # Complete game UI
└── styles/
    ├── main.css     # Title screen, common styles
    └── game.css     # Game screen, album, settings

assets/
├── data/            # CSV configuration files
│   ├── images.csv   # Image asset definitions
│   ├── audio.csv    # BGM and SE definitions
│   ├── text.csv     # UI text and dialogue
│   └── stages.csv   # Stage configuration
├── images/
│   ├── heroines/
│   │   └── stage1/  # Stage 1 heroine images (heroine_1_01.png ~ heroine_1_09.png)
│   └── ui/
│       ├── title_logo.png       # Title logo (blackboard style)
│       └── title_character.png  # Title character image
├── videos/          # Reward videos
└── audio/           # BGM and sound effects
```

## Development Commands

```bash
npm run dev          # Start development mode
npm run start        # Start application
npm run build        # Build for distribution
npm run pack         # Package as ASAR (no installer)
npm run dist         # Create installer with file protection
npm run clean        # Remove build artifacts
```

## Testing Protocol

**⚠️ IMPORTANT**: After any code modifications, always test the game by running:
```bash
npm start
```

This ensures:
- All systems load correctly
- UI modifications display properly
- Game mechanics function as expected
- No regression bugs are introduced

The game should start successfully and display all CSV data loading confirmations in the console.

## Key Technical Details

### Security & Distribution
- **ASAR Packaging**: Source code protected via electron-builder ASAR archive
- **Context Isolation**: Enabled for secure renderer-main communication
- **File Protection**: CSV data excluded from distribution, assets embedded in ASAR
- **Cross-platform**: Configured for Windows (NSIS), macOS (DMG), Linux (AppImage)

### Game Flow Architecture
1. **Title Screen** → Game Objective (first-run) → **Game Screen**
2. **Stage Progression**: Each stage unlock triggers dialogue + reward video
3. **Collection Loop**: Click → Earn Points → Buy Upgrades/Gacha → Collect Images
4. **Completion**: All images collected triggers final reward sequence

### Data Management
- **Game State**: Persistent via Electron file system (not web storage)
- **Asset Loading**: Dynamic loading based on CSV configurations
- **Save System**: Automatic save with backup/restoration capabilities
- **Content Updates**: CSV-driven for easy modification without code changes

## Language Requirements
- **User Communication**: All responses to users must be in Japanese
- **Internal Processing**: Internal tool usage, code comments, and system messages should be in English
- **Game Content**: All UI text, dialogue, and user-facing elements in Japanese
- **Code Documentation**: Comments, variables, and technical documentation can be in English

## Development Guidelines

### Game Logic Patterns
- Follow incremental game conventions (exponential cost scaling, idle progression)
- Implement visual feedback for all user interactions (click effects, animations)
- Ensure progression balance matches stage unlock requirements in `design.md`
- Stage themes: 教室 (classroom) → 図書館 (library) → 屋上 (rooftop) → 体育館 (gymnasium)

### Asset Integration
- **Images**: Referenced via CSV ID system, not hardcoded paths
  - Heroine images use sequential naming: `heroine_{stageId}_{number}.png` (e.g., heroine_1_01.png, heroine_1_02.png)
  - Numbers are zero-padded (01, 02, ..., 09) for consistent sorting
  - Image aspect ratios preserved with `object-fit: contain` to prevent distortion
  - Original image dimensions: 992 x 1456px (2:3 vertical ratio)
- **UI Graphics**:
  - Title logo: 1536 x 1024px (blackboard-style design)
  - Title character: 992 x 1456px (vertical portrait)
- **Audio**: System supports BGM looping and SE triggering
- **Video**: Rewards tied to stage progression milestones
- **Theming**: UI elements themed consistently across all stages

### Build Considerations
- ASAR archive ensures source protection for distribution
- Asset compression enabled for smaller package size
- Cross-platform icon configuration required for proper installation
- NSIS installer allows user-selectable install directory