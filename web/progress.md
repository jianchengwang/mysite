# Game Optimizations & Visual Polish Progress

## Latest Bugfix Pass (March 14, 2026 - Pass 3)

### 1. Lobster Workshop
- **Root Cause**: Sub-agent detection logic was too strict, causing background updates from minions to be ignored if they didn't follow a specific naming convention. `activeRunId` transitions were fragile, sometimes being hijacked by older run events. Sub-agent sprites were positioned too high, appearing outside the office area.
- **Fixes**:
    - **Lenient Sub-agent Detection**: Updated `updateMinion` to treat any session other than 'main' as a minion, ensuring telemetry always shows.
    - **Robust Run Tracking**: Improved `normalizeChatPayload` to only update `activeRunId` for relevant chat deltas and avoid overwriting with stale data.
    - **Layout Correction**: Adjusted `stageSlots` in `index.vue`, lowering the top offsets from 34% to 46% to keep helper lobsters within the office background.
- **Behavior Improvement**: Replies return reliably; sub-agents update in real-time without "freezing"; all lobsters stay inside the workshop.

### 2. Huarongdao
- **Root Cause**: Shortest-path hint calculation was running on the main UI thread via a computed property, causing the browser to freeze during large state space searches. The game only had one classic level.
- **Fixes**:
    - **Off-thread Search**: Moved the BFS hint search to a dedicated **Web Worker** (`huarongdao-search.worker.ts`).
    - **UI Responsiveness**: Added a loading state (`Calculating...`) for hints and a 2-second time limit/state limit in the worker to prevent infinite loops.
    - **Classic Levels**: Hardcoded 10 famous Huarongdao configurations (横刀立马, 齐头并进, 兵分两路, etc.) instead of random generation.
- **Behavior Improvement**: "Hint" button no longer freezes the browser; users can play through a curated list of classic puzzles.

### 3. Rubik's Cube
- **Root Cause**: `resolveFaceMove` used fixed coordinate checks that failed to account for camera rotation, making dragging unintuitive or "random" from different angles.
- **Fixes**:
    - **Camera-Aware Interaction**: Overhauled `resolveFaceMove` to adjust drag-to-move mapping based on the current `viewRotationY`.
    - **Improved Top Face Logic**: Added specific quadrant-based logic for the Top face, which is most sensitive to camera orientation.
    - **Deadzone Calibration**: Increased drag threshold to 15px to prevent accidental micro-turns.
- **Behavior Improvement**: Dragging a face now reliably turns the layer in the direction the user moves their mouse, regardless of camera angle.

### 4. Chinese Chess (Xiangqi)
- **Root Cause**: AI was too predictable because it always started with the same "best" move from the evaluation function.
- **Fixes**:
    - **Opening Book**: Implemented a standard opening library (`OPENING_BOOK`) with common starts like **中炮 (Central Cannon)**, **屏风马 (Screen Horses)**, and **飞相 (Elephant Opening)**.
    - **Randomized Openings**: The search function now picks randomly from available book moves for the first 4 plies.
- **Behavior Improvement**: AI play is more varied and human-like in the early game; no more identical matches every time.

## Verification Results
- **Build Status**: `npx nuxi build` passed successfully.
- **Files Changed**:
    - `workers/huarongdao-search.worker.ts` (New)
    - `workers/xiangqi-search.worker.ts`
    - `utils/games/huarongdao.ts`
    - `utils/games/chineseChess.ts`
    - `utils/games/rubiksCube.ts`
    - `pages/games/huarongdao/index.vue`
    - `pages/games/rubiks-cube/index.vue`
    - `pages/games/chinese-chess/index.vue`
    - `pages/tools/lobster-workshop/index.vue`
    - `composables/useOpenClawGateway.ts`
