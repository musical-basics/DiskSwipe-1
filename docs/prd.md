# Product Requirements Document (PRD)

**Project Name:** SwipeSweep (Working Title)  
**Goal:** Create a gamified, carousel-based desktop application to help users delete large, unused files on their Mac through rapid, low-cognitive-load micro-decisions.

## 1. Core Mechanics
- **Scan Engine:** The app scans specific user directories (e.g., `~/Downloads`, `~/Desktop`) looking for files larger than a user-defined threshold (default: > 100MB).
- **The Carousel:** Present one file at a time in a card UI.
- **Card Data:** Each card must show the File Name, File Size (in MB/GB), File Type/Icon, and Last Modified Date.

## 2. The Three Actions
- **Swipe Left (Delete):** Stages the file for deletion. File is moved to the macOS Trash (do not permanently `rm -rf` in V1 for safety).
- **Swipe Right (Snooze/Think About It):** Ignores the file for this session. Logs the file path in a local JSON file so it isn't shown again for 30 days.
- **Press "Star" / Up (Keep Forever):** Adds the file path to a `whitelist.json` file. The scanner will permanently ignore this file in the future.

## 3. UX/UI Requirements
- **Vibe:** Dark mode by default, minimalist, fast.
- **Animations:** Smooth card drag physics. The card should rotate slightly as it's dragged left or right. Background color shifts subtly red (left) or green (right) during the drag.
- **Shortcuts:** Keyboard support is critical. Left Arrow = Delete, Right Arrow = Snooze, Up Arrow = Keep.

## 4. Out of Scope for V1
- Deep content preview (e.g., rendering PDFs or playing videos inside the card). Just use file icons or basic thumbnail generation if easily supported.
- Cloud storage scanning. Local Mac files only.
