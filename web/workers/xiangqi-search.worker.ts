/**
 * PROFESSIONAL XIANGQI WORKER (FIXED UTILS ACCESS)
 */
console.log('[Worker] XIANGQI ENGINE BOOTSTRAP');

let engine = null;
let engineReady = false;
let isProcessing = false;
let openingBook = null;

// Robust function resolver
function getExport(mod, name) {
  if (mod[name]) return mod[name];
  if (mod.default && mod.default[name]) return mod.default[name];
  return null;
}

async function initEngine(Factory) {
  if (engineReady) return;
  try {
    engine = await Factory({
      locateFile: (path) => `/engines/fairy-stockfish-web/package/${path}`
    });
    
    // UCI Handshake
    engine.postMessage('uci');
    await new Promise((resolve) => {
      engine.listen = (line) => {
        if (line === 'uciok') resolve();
      };
    });

    engine.postMessage('setoption name UCI_Variant value xiangqi');
    engine.postMessage('setoption name Threads value 1');
    engine.postMessage('isready');
    
    await new Promise((resolve) => {
      engine.listen = (line) => {
        if (line === 'readyok') resolve();
      };
    });

    engineReady = true;
    console.log('[Worker] Fairy-Stockfish is ONLINE in Xiangqi mode');
  } catch (e) {
    console.error('[Worker] Engine init failed', e);
  }
}

self.onmessage = async (event) => {
  const { id, board, aiSide, difficulty, history = [], timeLimit = 3000 } = event.data;
  if (isProcessing) return;
  isProcessing = true;

  try {
    const mod = await import('../utils/games/chineseChess');
    
    const moveToUci = getExport(mod, 'moveToUci');
    const uciToMove = getExport(mod, 'uciToMove');
    const boardToFen = getExport(mod, 'boardToFen');
    const searchBestXiangqiMove = getExport(mod, 'searchBestXiangqiMove');

    if (!moveToUci || !uciToMove || !boardToFen || !searchBestXiangqiMove) {
      throw new Error(`Missing exports: moveToUci:${!!moveToUci}, uciToMove:${!!uciToMove}, boardToFen:${!!boardToFen}, searchBestXiangqiMove:${!!searchBestXiangqiMove}`);
    }
    
    // 1. Opening Book
    try {
      if (!openingBook) {
        const bookUrl = new URL('/engines/xiangqi-opening-book.json?v=' + Date.now(), self.location.origin);
        const response = await fetch(bookUrl);
        openingBook = await response.json();
      }
      const key = history.map(m => moveToUci(m)).join(',');
      const choices = openingBook[key];
      if (choices && choices.length > 0) {
        const bookMoveUci = choices[Math.floor(Math.random() * choices.length)].move;
        const move = uciToMove(board, bookMoveUci);
        if (move && move.piece.side === aiSide) {
          self.postMessage({ id, result: { move, score: 0, nodes: 0, source: 'opening_book', backend: 'xqwlight-book' } });
          isProcessing = false;
          return;
        }
      }
    } catch (e) { console.warn('[Worker] Book skipped', e); }

    // 2. Professional Engine
    if (typeof SharedArrayBuffer !== 'undefined') {
      try {
        const engineUrl = new URL('/engines/fairy-stockfish-web/package/fairyStockfishWeb.js', self.location.origin).href;
        const engineMod = await import(/* @vite-ignore */ engineUrl);
        const Factory = engineMod.default || engineMod;
        
        await initEngine(Factory);
        
        if (engineReady) {
          const fen = boardToFen(board, aiSide);
          const skill = difficulty.id === 'easy' ? 5 : difficulty.id === 'medium' ? 12 : 20;
          engine.postMessage(`setoption name Skill Level value ${skill}`);
          engine.postMessage('ucinewgame');
          
          let bestMoveUci = '';
          await new Promise((resolve) => {
            const timeout = setTimeout(resolve, timeLimit + 1000);
            engine.listen = (line) => {
              if (line.startsWith('bestmove')) {
                clearTimeout(timeout);
                bestMoveUci = line.split(' ')[1];
                resolve();
              }
            };
            engine.postMessage(`position fen ${fen}`);
            engine.postMessage(`go movetime ${timeLimit}`);
          });

          if (bestMoveUci && bestMoveUci !== '(none)') {
            const move = uciToMove(board, bestMoveUci);
            if (move && move.piece.side === aiSide) {
              self.postMessage({ id, result: { move, score: 0, nodes: 0, source: 'engine', backend: 'Fairy-Stockfish' } });
              isProcessing = false;
              return;
            }
          }
        }
      } catch (e) { console.error('[Worker] Engine error', e); }
    }

    // 3. Fallback Built-in
    const result = searchBestXiangqiMove(board, aiSide, difficulty, [], timeLimit, history);
    self.postMessage({ id, result });

  } catch (err) {
    console.error('[Worker] Fatal Error:', err);
    self.postMessage({ id, result: { move: null, score: 0, nodes: 0, source: 'error' } });
  } finally {
    isProcessing = false;
  }
};
