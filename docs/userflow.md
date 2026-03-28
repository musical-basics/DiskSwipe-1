# SwipeSweep - User Flow

## 1. App Launch & Permissions State
* **Trigger:** User opens the application.
* **Action:** App checks for macOS directory read/write permissions.
* **UI:** 
  * If permissions missing: Display a full-screen prompt asking the user to grant "Full Disk Access" or "Files and Folders" permission in Mac System Settings.
  * If permissions granted: Automatically transition to Scanning State.

## 2. Scanning State
* **Trigger:** Permissions verified.
* **Action:** Electron Main process runs a recursive scan on `~/Downloads` and `~/Desktop` filtering for files > 100MB. Sorts by size (descending). Filters out files present in `whitelist.json` or currently active in `snooze.json`.
* **UI:** A pulsing, satisfying loading animation (e.g., radar or searching icon) with text "Hunting down heavy files...".

## 3. The Carousel State (Main Loop)
* **Trigger:** Scan completes and returns an array of file objects.
* **UI:** The main Swipe Card interface. Shows File 1 of N.
* **Actions (The Loop):**
  * **User Swipes Left (Trash):**
    1. Card animates flying off to the left.
    2. Frontend sends IPC message `move-to-trash` with file path.
    3. Main process moves file to macOS Trash.
    4. Next card loads.
  * **User Swipes Right (Snooze):**
    1. Card animates flying off to the right.
    2. Frontend sends IPC message `snooze-file` with file path.
    3. Main process appends to `snooze.json` with a timestamp.
    4. Next card loads.
  * **User Clicks Star (Keep):**
    1. Card animates shrinking/popping.
    2. Frontend sends IPC message `whitelist-file` with file path.
    3. Main process appends to `whitelist.json`.
    4. Next card loads.

## 4. Session Complete State
* **Trigger:** The array of scanned files reaches 0.
* **Action:** Calculate total megabytes moved to trash during this session.
* **UI:** A success screen celebrating the user. 
  * "Boom. You just freed up [X.XX] GB."
  * Button: "Empty Trash Now" (Triggers macOS trash empty).
  * Button: "Scan Again" (Restarts flow).
