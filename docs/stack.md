# Tech Stack

App Framework: Electron (using standard IPC for Main/Renderer communication).

Build Tool: Vite (for Lightning-fast React hot-reloading).

Frontend Library: React 18.

Styling: Tailwind CSS (for quick, utility-class styling).

Animation: framer-motion (specifically using the `useAnimation` and `PanInfo` hooks for the Tinder-style swipe physics).

Icons: lucide-react (clean, modern icons).

File System: Node.js native `fs/promises` and `path` modules (running strictly in the Electron Main process).

> **Crucial Note for AI:**
> AI agents sometimes struggle with Electron's security model (Context Isolation). They might try to use `fs.readFileSync` directly inside React components—which will immediately crash. Use Electron IPC for all file system operations; keep Node.js out of the React frontend.
