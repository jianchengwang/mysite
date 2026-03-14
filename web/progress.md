# Game Optimizations & Visual Polish Progress

## Latest Bugfix Pass (March 14, 2026 - Pass 2)

### 1. Chinese Chess (Xiangqi) AI
- **Root Cause**: Hard difficulty was performing iterative deepening without a strict time budget, leading to freezes. Medium difficulty was too deterministic (always picking the same highest score). AI was susceptible to perpetual chasing loops because it didn't track game history.
- **Fixes**:
    - Added **time limit (3 seconds)** and **abort check** in the search worker.
    - Implemented **randomness (±3 score points)** at the root for Easy/Medium difficulties to vary openings.
    - Added **repetition detection** using Zobrist history keys to prevent perpetual chasing.
- **Behavior Improvement**: Hard difficulty returns moves reliably within 3s; play is more varied and less repetitive.

### 2. Rubik's Cube
- **Root Cause**: Drag-to-rotate logic used a fixed mapping that didn't account for cubie position or actual layer mechanics, making rotations feel unintuitive and physically impossible.
- **Fixes**:
    - Overhauled **`resolveFaceMove`** with intelligent mapping: dragging a sticker now turns the specific horizontal/vertical layer it belongs to.
    - Updated **`cubieStyle`** and preview logic to support turning any slice (x, y, or z axis) based on the drag direction.
    - Improved visual feedback during drag with accurate layer-based rotation previews.
- **Behavior Improvement**: Dragging feels natural and matches physical cube mechanics (e.g., dragging the top row of the front face moves the Top layer).

### 3. Huarongdao
- **Root Cause**: The game lacked the most famous starting configuration.
- **Fixes**:
    - Added the classic **"横刀立马" (Hengdao Lima)** level as the first level in the game.
- **Behavior Improvement**: Users can now play the definitive Huarongdao challenge.

### 4. Lobster Workshop
- **Root Cause**: Boss replies were hidden in the UI while helper workers were active due to a logic flaw in `streamingChatCard`. Historical messages were being automatically loaded on every connection, cluttering new sessions.
- **Fixes**:
    - Fixed **`streamingChatCard` visibility** so boss replies show immediately even when subagents are armed.
    - Removed automatic **`loadHistory`** on connect to ensure a clean slate for new sessions.
    - Added explicit **state clearing** (messages, minion cards, dispatches) when starting a fresh connection.
    - Reduced local dispatch history persistence from 8 hours to 1 hour.
- **Behavior Improvement**: Messages appear instantly without refreshing; sessions start clean and focused.

## Verification Results
- **Build Status**: `npx nuxi build` passed successfully.
- **Files Changed**:
    - `utils/games/chineseChess.ts`
    - `utils/games/huarongdao.ts`
    - `workers/xiangqi-search.worker.ts`
    - `pages/games/chinese-chess/index.vue`
    - `pages/games/rubiks-cube/index.vue`
    - `pages/tools/lobster-workshop/index.vue`
    - `composables/useOpenClawGateway.ts`
