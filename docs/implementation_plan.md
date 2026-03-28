# 5-Phase Implementation Plan: SwipeSweep

## Phase 1: Project Initialization & Foundation
- **Scaffold Application:** Initialize the Electron app using a modern boilerplate (Vite + React 18 + TypeScript).
- **Core Dependencies:** Install and configure Tailwind CSS for styling, Framer Motion for animations, and Lucide React for UI icons.
- **Architectural Setup:** Establish the strict Context Isolation boundary. Set up the Preload script and define the initial IPC (Inter-Process Communication) types and bridges between the Main process and Renderer (React frontend).

## Phase 2: Main Process Logic (File System & Permissions)
- **Permissions Management:** Implement logic in the Main process to check macOS read/write directory permissions and prompt for access if missing.
- **File Scanner:** Build the recursive scanning engine utilizing Node's `fs/promises`. Configure it to target `~/Downloads` and `~/Desktop` and filter for files over the 100MB threshold.
- **Data Persistence:** Implement local JSON storage readers/writers for `whitelist.json` and `snooze.json` tracking to filter out excluded files from future scans.
- **IPC Handlers:** Set up the event listeners in the Main process for all core actions (scanning trigger, send to trash, snooze, and keep).

## Phase 3: Application State & Flow Shell
- **Routing/State Machine:** Set up basic React State (or a lightweight state machine) to transition between the four core views: Permissions => Scanning => Carousel => Session Complete.
- **Permissions UI:** Build the full-screen prompt guiding the user to macOS System Settings.
- **Scanning UI:** Create the pulsing "radar/searching" loading screen and trigger the IPC event to start scanning upon load.

## Phase 4: Carousel Component & The "Tinder" Interaction
- **Card UI:** Build the central File Card component displaying Name, Size, Icon, and Date.
- **Physics & Gestures:** Utilize `framer-motion` (`useAnimation`, `PanInfo`) to build the drag behavior, tracking X-axis off-sets for rotation interpolation and velocity for swipe detection.
- **Color Feedback:** Map the drag offset to subtle background color interpolations (trending red on the left, trending green on the right).
- **Control Bindings:** Wire up both the visual swipe gestures and critical Keyboard Event listeners (Left, Right, Up) to trigger the respective IPC handlers (`move-to-trash`, `snooze-file`, `whitelist-file`). Modify the React State to transition to the next file in the array.

## Phase 5: Polish & Final Outcomes
- **Success Screen:** Build the dynamic "Session Complete" summary UI reflecting the calculated total GB moved.
- **Action Triggers:** Implement "Empty Trash Now" button to trigger macOS trash emptying via shell interaction (if permitted/safe) and "Scan Again" workflow resets.
- **Visual Improvements:** Finalize dark mode details, tweak animation spring stiffness/damping for an ultra-premium feel, and confirm fast performance with hundreds of file objects loaded in memory.
