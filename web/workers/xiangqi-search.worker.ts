/**
 * PROFESSIONAL XIANGQI WORKER (FIXED UTILS ACCESS)
 */
console.log('[Worker] XIANGQI ENGINE BOOTSTRAP');

let isProcessing = false;
let openingBook = null;
const enableExternalEngine = true;
let bridgeWorker = null;
let bridgeRequestId = 0;
const bridgePending = new Map();
let bridgeWarmed = false;

function getLastMoveForSide(history, side) {
  for (let index = history.length - 1; index >= 0; index--) {
    const move = history[index];
    if (move?.piece?.side === side) {
      return move;
    }
  }
  return null;
}

function isImmediateReversal(move, previousMove) {
  if (!move || !previousMove) return false;
  return (
    move.piece?.side === previousMove.piece?.side &&
    move.from.row === previousMove.to.row &&
    move.from.col === previousMove.to.col &&
    move.to.row === previousMove.from.row &&
    move.to.col === previousMove.from.col &&
    !move.captured
  );
}

function isRepeatedPosition(move, board, historyKeys, getXiangqiMoveResultKey) {
  if (!move || !historyKeys?.length || !getXiangqiMoveResultKey) return false;
  const nextKey = getXiangqiMoveResultKey(board, move);
  const recentWindow = historyKeys.slice(-10);
  return recentWindow.some((key) => key === nextKey);
}

function shouldAvoidMove(move, board, aiSide, history, historyKeys, getXiangqiMoveResultKey) {
  const lastOwnMove = getLastMoveForSide(history, aiSide);
  if (isImmediateReversal(move, lastOwnMove)) return true;
  return isRepeatedPosition(move, board, historyKeys, getXiangqiMoveResultKey);
}

function chooseBookMove(choices, difficultyId, board, aiSide, history, historyKeys, uciToMove, getXiangqiMoveResultKey) {
  if (!choices || choices.length === 0) return null;
  const ranked = [...choices].sort((a, b) => (b.weight || 0) - (a.weight || 0));
  const poolSize = difficultyId === 'easy' ? 1 : difficultyId === 'medium' ? 3 : 5;
  const pool = ranked.slice(0, Math.min(poolSize, ranked.length));
  const filteredPool = pool.filter((item) => {
    const move = uciToMove(board, item.move, aiSide);
    return move && !shouldAvoidMove(move, board, aiSide, history, historyKeys, getXiangqiMoveResultKey);
  });
  const candidates = filteredPool.length ? filteredPool : pool;
  const totalWeight = candidates.reduce((sum, item) => sum + Math.max(1, item.weight || 1), 0);

  let roll = Math.random() * totalWeight;
  for (const item of candidates) {
    roll -= Math.max(1, item.weight || 1);
    if (roll <= 0) {
      return item.move;
    }
  }

  return candidates[0]?.move || null;
}

// Robust function resolver
function getExport(mod, name) {
  if (mod[name]) return mod[name];
  if (mod.default && mod.default[name]) return mod.default[name];
  return null;
}

function ensureBridgeWorker() {
  if (bridgeWorker) return bridgeWorker;
  bridgeWorker = new Worker(new URL('/engines/xiangqi-bridge.worker.js', self.location.origin));
  bridgeWorker.onmessage = (event) => {
    const payload = event.data;
    if (!payload || payload.type === 'ready') return;
    if (payload.type === 'unavailable') {
      console.warn('[Worker] Bridge unavailable', payload.reason);
      return;
    }
    const pending = bridgePending.get(payload.id);
    if (!pending) return;
    bridgePending.delete(payload.id);
    if (payload.type === 'result') {
      pending.resolve(payload.result);
      return;
    }
    pending.reject(new Error(payload.reason || 'Bridge search failed'));
  };
  bridgeWorker.onerror = (error) => {
    for (const pending of bridgePending.values()) {
      pending.reject(error);
    }
    bridgePending.clear();
  };
  return bridgeWorker;
}

function warmBridgeWorker() {
  if (bridgeWarmed || !enableExternalEngine || typeof SharedArrayBuffer === 'undefined') return;
  bridgeWarmed = true;
  ensureBridgeWorker().postMessage({ type: 'warmup' });
}

function searchWithBridge(difficultyId, history, legalMoves) {
  const worker = ensureBridgeWorker();
  const id = ++bridgeRequestId;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      bridgePending.delete(id);
      reject(new Error('Bridge search timed out'));
    }, 12000);
    bridgePending.set(id, {
      resolve: (result) => {
        clearTimeout(timeout);
        resolve(result);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    });
    worker.postMessage({
      type: 'search',
      id,
      difficultyId,
      history,
      legalMoves
    });
  });
}

self.onmessage = async (event) => {
  if (event.data?.type === 'warmup') {
    warmBridgeWorker();
    return;
  }

  const { id, board, aiSide, difficulty, history = [], historyKeys = [], timeLimit = 3000 } = event.data;
  if (isProcessing) return;
  isProcessing = true;

  try {
    const mod = await import('../utils/games/chineseChess');
    
    const moveToUci = getExport(mod, 'moveToUci');
    const uciToMove = getExport(mod, 'uciToMove');
    const generateLegalXiangqiMoves = getExport(mod, 'generateLegalXiangqiMoves');
    const searchBestXiangqiMove = getExport(mod, 'searchBestXiangqiMove');
    const getXiangqiMoveResultKey = getExport(mod, 'getXiangqiMoveResultKey');

    if (!moveToUci || !uciToMove || !generateLegalXiangqiMoves || !searchBestXiangqiMove || !getXiangqiMoveResultKey) {
      throw new Error(`Missing exports: moveToUci:${!!moveToUci}, uciToMove:${!!uciToMove}, generateLegalXiangqiMoves:${!!generateLegalXiangqiMoves}, searchBestXiangqiMove:${!!searchBestXiangqiMove}, getXiangqiMoveResultKey:${!!getXiangqiMoveResultKey}`);
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
        const bookMoveUci = chooseBookMove(
          choices,
          difficulty.id,
          board,
          aiSide,
          history,
          historyKeys,
          uciToMove,
          getXiangqiMoveResultKey
        );
        const move = uciToMove(board, bookMoveUci);
        if (move && move.piece.side === aiSide) {
          self.postMessage({ id, result: { move, score: 0, nodes: 0, source: 'opening_book', backend: 'xqwlight-book' } });
          isProcessing = false;
          return;
        }
      }
    } catch (e) { console.warn('[Worker] Book skipped', e); }

    // 2. Professional Engine
    if (enableExternalEngine && typeof SharedArrayBuffer !== 'undefined') {
      try {
        const legalMoves = generateLegalXiangqiMoves(board, aiSide);
        const bridgeResult = await searchWithBridge(difficulty.id, history, legalMoves);
        if (
          bridgeResult?.move &&
          bridgeResult.move.piece?.side === aiSide &&
          !shouldAvoidMove(bridgeResult.move, board, aiSide, history, historyKeys, getXiangqiMoveResultKey)
        ) {
          self.postMessage({
            id,
            result: {
              ...bridgeResult,
              source: 'engine',
              backend: bridgeResult.backend || 'Fairy-Stockfish'
            }
          });
          isProcessing = false;
          return;
        }
      } catch (e) { console.error('[Worker] Engine error', e); }
    }

    // 3. Fallback Built-in
    const result = searchBestXiangqiMove(board, aiSide, difficulty, historyKeys, timeLimit, history);
    self.postMessage({ id, result });

  } catch (err) {
    console.error('[Worker] Fatal Error:', err);
    self.postMessage({ id, result: { move: null, score: 0, nodes: 0, source: 'error' } });
  } finally {
    isProcessing = false;
  }
};
