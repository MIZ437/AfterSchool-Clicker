# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "AfterSchool Clicker" - a CookieClicker-style incremental game written in Japanese with anime/heroine themes. The core gameplay involves clicking on heroine images to earn points, purchasing upgrades, unlocking new stages, and collecting images through a gacha system.

## Game Architecture

### Core Game Flow
- Title Screen → Game Objective (first run) → Stage 1 → Dialogue & Reward Video → Stage 2 → etc. → Ending
- Players click heroine images to earn points
- Points are used to purchase upgrades, unlock stages, and draw gacha for new images
- Each stage has its own theme and heroine image collection

### Key Game Systems
1. **Point System**: Click-based point generation with upgrades for Click Per Point and Points Per Second
2. **Stage System**: Sequential stage unlocking with point costs, each stage has unique themes and content
3. **Gacha System**: Point-based image collection with no duplicates, organized by stage themes
4. **Album System**: Gallery for viewing collected images and reward videos, organized by stages
5. **Shop System**: Purchase upgrades for click efficiency and automatic point generation

### UI Structure
- **Header**: Current points, Points Per Second, current stage, next stage unlock cost
- **Stage Navigation**: Tab-based navigation for unlocked stages
- **Main Area**: Large heroine image for clicking
- **Side Panel**: Shop and Gacha buttons
- **Footer**: Album, Settings, and Exit buttons

### Asset Management
Assets are managed via CSV files for easy modification:
- Images (heroines, title logos)
- Videos (reward short videos)
- Audio (BGM, sound effects)
- Text (UI labels, dialogue)

## Development Status

This is a new project with only a planning document (plan.md) currently present. No code has been implemented yet.

## Notes

- All UI text and content should be in Japanese
- The game follows typical incremental/clicker game patterns
- Save data persistence is required
- Interactive feedback (lighting effects, click animations) is important for user experience
- Stage progression includes narrative elements with dialogue and reward videos