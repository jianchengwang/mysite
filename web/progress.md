# Game Optimizations & Visual Polish Progress

## Recent Bugfix Pass (March 14, 2026)

### 1. Gomoku AI
- **Root Cause**: Search was using expensive string-based board hashing for every node, and depth settings were too shallow for Medium while too wide for Hard.
- **Fixes**:
    - Implemented **Zobrist Hashing** for O(1) board state keys.
    - Optimized **Transposition Table** usage by removing depth from key and checking entry depth.
    - Adjusted difficulty: Medium depth increased to 4 (stronger), Hard width reduced to 8 but depth increased to 6 (faster but deeper).
    - Improved **nearby stone detection** radius for better candidate moves.
- **Behavior Improvement**: Medium feels competent; Hard responds much faster and plays more deeply.

### 2. Chinese Chess AI
- **Root Cause**: Check detection (`isInternalInCheck`) was generating all legal moves for the opponent, which was O(N^2) and slow in JavaScript.
- **Fixes**:
    - Optimized `isInternalInCheck` to directly check threat lines/patterns (Horse, Rook, Cannon, Soldier) from the General's square.
    - Balanced depth settings: Hard reduced from 7 to 6, Medium from 5 to 4 to ensure responsiveness in the browser.
- **Behavior Improvement**: AI responds significantly faster, especially in complex positions.

### 3. Fish Pond
- **Root Cause**: Movement logic was a simple X-axis oscillation with a fixed bobbing phase.
- **Fixes**:
    - Added **target-based vertical movement** with smooth interpolation.
    - Implemented **state-based movement**: alternating between 'drifting' (slow) and 'darting' (fast).
    - Added random direction changes and tilt/rotation based on vertical speed.
- **Behavior Improvement**: Fish feel much more alive with varied, lifelike motion and unpredictable "darts".

### 4. Rubik's Cube
- **Root Cause**: Missing state variables (`previewFace`, `previewAxis`, `previewAngle`) and lack of visual feedback during dragging made rotations feel broken.
- **Fixes**:
    - Fixed missing declarations and defined `clearFacePreview`.
    - Integrated **drag preview** into the `cubieStyle` transform logic.
    - Synced drag distance to a visual rotation angle (limited to 34 degrees) for immediate feedback.
- **Behavior Improvement**: Dragging a face now shows it physically rotating in real-time before the move is committed.

### 5. Huarongdao
- **Root Cause**: Interaction layers were blocking each other, and drag thresholds were too sensitive for small screens.
- **Fixes**:
    - Added explicit **z-index** hierarchy: `hua-target` (20) > `hua-piece` (10).
    - Increased drag threshold to **30px** and added a `hasDragged` guard to prevent accidental selection switches.
    - Ensured state reset on `pointerdown` to keep pieces operable.
- **Behavior Improvement**: Hit detection is reliable; pieces can be both dragged and clicked without becoming stuck.

### 6. Lobster Workshop
- **Root Cause**: Assistant replies for dispatch runs were being filtered out of the chat window, leading to "missing" replies. History was replaying stale local dispatches.
- **Fixes**:
    - Removed assistant message filtering: all replies now appear in the main chat flow.
    - Added **8-hour expiration** for `recentDispatches` in local storage to prevent stale replay.
    - Preserved visibility in both the Chat window and the Task Board.
- **Behavior Improvement**: Immediate visibility of all replies; cleaner initial load without stale history.

## Verification Results
- **Build Status**: `npx nuxi build` passed successfully.
- **Files Changed**:
    - `utils/games/gomoku.ts`
    - `utils/games/chineseChess.ts`
    - `pages/games/fish-pond/index.vue`
    - `pages/games/rubiks-cube/index.vue`
    - `pages/games/huarongdao/index.vue`
    - `pages/tools/lobster-workshop/index.vue`
