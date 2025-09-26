# AfterSchool Clicker

![GitHub last commit](https://img.shields.io/github/last-commit/MIZ437/AfterSchool-Clicker)
![GitHub license](https://img.shields.io/github/license/MIZ437/AfterSchool-Clicker)

A heroine-themed incremental clicker game built with Electron. Collect points by clicking beautiful anime-style heroines, purchase upgrades, and collect character images through a gacha system.

## 🎮 Features

- **Incremental Clicker Mechanics**: Click to earn points and purchase upgrades
- **4-Stage Progression System**: Unlock new stages as you progress
- **Gacha Collection System**: Collect 160+ heroine images with no duplicates
- **Album/Gallery**: View all collected images and reward videos
- **Shop System**: Purchase items to increase click efficiency and passive income
- **Audio System**: Background music and sound effects
- **Visual Effects**: Particle effects and smooth animations
- **Auto-Save**: Configurable auto-save intervals (10s/30s/1m/5m)
- **Settings**: Volume controls and game preferences
- **Japanese UI**: Full Japanese localization

## 🚀 Installation

### Prerequisites

- Node.js (v16 or later)
- npm (v8 or later)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/MIZ437/AfterSchool-Clicker.git
cd AfterSchool-Clicker
```

2. Install dependencies:
```bash
npm install
```

3. Start the game:
```bash
npm start
```

## 🎯 Game Mechanics

### Progression System
- **Stage 1**: 教室 (Classroom) - Starting stage
- **Stage 2**: 図書館 (Library) - Unlock at 1,000 points
- **Stage 3**: 屋上 (Rooftop) - Unlock at 10,000 points
- **Stage 4**: 体育館 (Gymnasium) - Unlock at 100,000 points

### Collection System
- Each stage contains unique heroine images to collect
- Use the gacha system to unlock new characters
- No duplicate system ensures every pull is valuable
- Complete collections unlock special reward videos

### Upgrade System
- Purchase click multipliers and passive income generators
- Items provide exponential scaling for long-term progression
- Strategic purchasing required for optimal efficiency

## 🛠️ Development

### Build Commands

```bash
npm run start        # Start development mode
npm run build        # Build for production
npm run pack         # Package as ASAR
npm run dist         # Create installer
```

### Project Structure

```
src/
├── main.js          # Electron main process
├── preload.js       # Secure IPC bridge
├── index.html       # Game UI
├── js/              # Game logic modules
│   ├── gameState.js    # Core state management
│   ├── clickSystem.js  # Click mechanics
│   ├── gachaSystem.js  # Collection mechanics
│   ├── shopSystem.js   # Item purchasing
│   └── ...
└── styles/          # CSS styling

assets/
├── data/            # CSV configuration files
├── images/          # Character images
├── audio/           # Sound files
└── videos/          # Reward videos
```

## 🎨 Technologies Used

- **Electron**: Cross-platform desktop application framework
- **JavaScript ES6+**: Modern JavaScript features
- **CSS3**: Advanced styling and animations
- **CSV**: Data-driven content management
- **Node.js**: Backend functionality

## 🎵 Audio

The game features:
- Background music for each stage
- Sound effects for interactions
- Configurable volume controls
- Audio context management for web standards compliance

## 💾 Save System

- Automatic saving with configurable intervals
- Manual save/load functionality
- Data backup and restore capabilities
- Cross-session persistence

## 🔧 Configuration

Game data is managed through CSV files for easy modification:
- `stages.csv`: Stage definitions and unlock requirements
- `items.csv`: Shop items and their effects
- `images.csv`: Character image collections
- `audio.csv`: Sound file definitions
- `videos.csv`: Reward video definitions

## 📦 Building & Distribution

The game can be packaged for multiple platforms:

- **Windows**: NSIS installer and portable executable
- **macOS**: DMG and ZIP distributions
- **Linux**: AppImage and DEB packages

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with assistance from Claude AI
- Electron framework and community
- All contributors and testers

## 📞 Contact

- GitHub: [@MIZ437](https://github.com/MIZ437)
- Email: ashimizu437@gmail.com

---

🎮 **Enjoy collecting beautiful heroines in AfterSchool Clicker!** 🎮