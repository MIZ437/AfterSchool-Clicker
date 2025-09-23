# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2024-09-24

### Added
- **Project Planning & Design**
  - Created comprehensive game design document (design.md)
  - Created original requirements specification (plan.md)
  - Created development guidelines (CLAUDE.md)

- **Electron Project Setup**
  - Initialized Electron application structure
  - Configured package.json with build settings and scripts
  - Implemented main process (src/main.js) with IPC handlers
  - Implemented secure preload script (src/preload.js)
  - Added file protection configuration with ASAR

- **Project Structure**
  - Created organized directory structure for assets and source code
  - Added .gitignore for proper version control
  - Set up asset management directories (images, audio, videos, data)

- **HTML Foundation**
  - Created main HTML structure (src/index.html)
  - Implemented all UI screens (title, objective, game, modals)
  - Added Japanese UI text throughout

- **Data Management System**
  - Created CSV-based asset management system
  - Added images.csv for heroine and UI image management
  - Added audio.csv for BGM and sound effect management
  - Added text.csv for localization and UI text
  - Added stages.csv for stage configuration

- **Security Features**
  - Enabled contextIsolation and disabled nodeIntegration
  - Configured ASAR packaging for file protection
  - Set up secure IPC communication between processes

### Changed
- Updated CLAUDE.md to include Electron development requirements
- Updated CLAUDE.md to specify Japanese language requirement for user communication

### Technical Details
- **Framework**: Electron 27.0.0
- **Build Tool**: electron-builder 24.6.4
- **Security**: Context isolation enabled, ASAR packaging
- **Platform**: Cross-platform desktop application
- **Data Persistence**: Electron userData directory

## Next Steps
1. Install npm dependencies
2. Implement CSS styling (main.css, title.css, game.css)
3. Implement JavaScript game logic modules
4. Test basic functionality
5. Add audio and visual assets

---

## Version History
- **[Unreleased]**: Current development version
- Project started: 2024-09-24