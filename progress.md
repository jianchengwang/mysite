Original prompt: 顶部菜单Tools后面增加Games菜单，然后点击进去Games的页面，类似Tools界面那样展示游戏页面，然后新增几个游戏，五子棋，象棋棋，都可以人机对战跟选择难度，剪枝算法在前端实现，风格符合界面风格极简风格；摸鱼游戏，就是可以调用白板画一张图，然后保存直接在页面上游动即可；3d魔方立体游戏，主要就是一个3d魔方显示在界面上，然后可以玩，最好可以提示步骤等教你怎么玩魔方，下一步建议；华容道益智类游戏，很多关卡；请先实现这几个游戏；页面风格要符合当前的网站风格；

- 2026-03-14: Read header, Tools page, sketch styles, and Whiteboard save flow. Plan is to add a Games catalog page and five game routes that reuse the current hand-drawn minimal UI language.
- 2026-03-14: Will implement game logic in front-end utility modules where practical so AI/game state stays separate from page layout.
- 2026-03-14: Added `/games` navigation entry, a shared game catalog/data model, and a common `GameShell` layout so all game pages inherit the same minimal hand-drawn presentation.
- 2026-03-14: Implemented Gomoku and Xiangqi front-end AI pages with difficulty selectors, human/AI side selection, undo, move logs, and alpha-beta search utilities in `web/utils/games`.
- 2026-03-14: Implemented Doodle Fish Pond with modal whiteboard reuse and transparent whiteboard exports so saved drawings can swim on the page and persist in local storage.
- 2026-03-14: Implemented a 3D Rubik's Cube page with a cubie-state model, move controls, drag-to-rotate stage, beginner-method guidance, and deterministic rewind suggestions.
- 2026-03-14: Implemented Huarongdao with multiple generated levels, click-to-move interactions, undo, and replay-based hints that always point back toward a known solvable path.
- 2026-03-14: Verified with Node 25 production builds, logic smoke tests for Gomoku/Xiangqi/Cube/Huarongdao, and headless Chrome screenshots for `/games`, Gomoku, Xiangqi, Fish Pond, Rubik's Cube, and Huarongdao.
- 2026-03-14: Environment note: the workspace default `node` / `npm` path can fall back to Node 20, so successful build commands were run with `PATH=/opt/homebrew/bin:$PATH` and `/opt/homebrew/bin/node`.
