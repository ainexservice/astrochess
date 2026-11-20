/* Run: node engine-smoke.js */
global.window = global;
require('./chess-engine.js');
const Chess = global.AstroChess;
function assert(condition, message) { if (!condition) throw new Error(message); }
function fromFen(fen) {
  const [placement, turn, rights, ep, half='0', full='1'] = fen.split(' ');
  const board=[];
  for (const row of placement.split('/')) for (const token of row) {
    if (/\d/.test(token)) for (let i=0;i<Number(token);i++) board.push(null);
    else board.push((token===token.toUpperCase()?'w':'b')+token.toLowerCase());
  }
  return {board,turn,rights:{K:rights.includes('K'),Q:rights.includes('Q'),k:rights.includes('k'),q:rights.includes('q')},ep:ep==='-'?-1:Chess.square(ep),half:Number(half),full:Number(full)};
}
function perft(pos, depth) { if(depth===0)return 1;let count=0;for(const m of Chess.legalMoves(pos))count+=perft(Chess.applyMove(pos,m),depth-1);return count; }
const cases=[
  ['Starting Position','rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',[20,400,8902]],
  ['Kiwipete','r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',[48,2039,97862]],
  ['En Passant Pin Test','8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',[14,191,2812]],
  ['Castling Test','r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',[6,264]],
  ['Promotion Test','rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',[44,1486]],
  ['Tactical Test','r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10',[46,2079]]
];
for(const [name,fen,expected] of cases){
  const p=fromFen(fen);
  expected.forEach((value,index)=>assert(perft(p,index+1)===value,`${name} depth ${index+1}: expected ${value}`));
  console.log(`✓ ${name}: ${expected.join(', ')}`);
}
function play(p, from, to, extra={}) {
  const m=Chess.legalMoves(p).find(x=>Chess.coord(x.from)===from&&Chess.coord(x.to)===to&&Object.entries(extra).every(([k,v])=>x[k]===v));
  assert(m,`Expected legal move ${from}${to}`);return Chess.applyMove(p,m);
}
let p=Chess.initialPosition();
p=play(p,'e2','e4');p=play(p,'a7','a6');p=play(p,'e4','e5');p=play(p,'d7','d5');
assert(Chess.legalMoves(p).some(m=>Chess.coord(m.from)==='e5'&&Chess.coord(m.to)==='d6'&&m.epCapture),'en passant not found');
p=Chess.initialPosition();p=play(p,'e2','e4');p=play(p,'e7','e5');p=play(p,'g1','f3');p=play(p,'b8','c6');p=play(p,'f1','e2');p=play(p,'g8','f6');
assert(Chess.legalMoves(p).some(m=>m.castle==='K'&&Chess.coord(m.from)==='e1'&&Chess.coord(m.to)==='g1'),'castling not found');
p=fromFen('7k/4P3/8/8/8/8/8/7K w - - 0 1');
assert(['q','r','b','n'].every(promo=>Chess.legalMoves(p).some(m=>m.promotion===promo)),'promotion choices missing');
console.log('✓ Special moves: castling, en passant, promotion');

// Execute and verify each special-move transition, not only move availability.
p=Chess.initialPosition();
p=play(p,'e2','e4');p=play(p,'a7','a6');p=play(p,'e4','e5');p=play(p,'d7','d5');
const epMove=Chess.legalMoves(p).find(m=>Chess.coord(m.from)==='e5'&&Chess.coord(m.to)==='d6'&&m.epCapture);
p=Chess.applyMove(p,epMove);
assert(p.board[Chess.square('d5')]==null && p.board[Chess.square('d6')]==='wp','en-passant execution failed');
p=Chess.initialPosition();
p=play(p,'e2','e4');p=play(p,'e7','e5');p=play(p,'g1','f3');p=play(p,'b8','c6');p=play(p,'f1','e2');p=play(p,'g8','f6');
const castle=Chess.legalMoves(p).find(m=>m.castle==='K'&&Chess.coord(m.from)==='e1');
p=Chess.applyMove(p,castle);
assert(p.board[Chess.square('g1')]==='wk' && p.board[Chess.square('f1')]==='wr','castling execution failed');
p=fromFen('7k/4P3/8/8/8/8/8/7K w - - 0 1');
const promotion=Chess.legalMoves(p).find(m=>Chess.coord(m.from)==='e7'&&Chess.coord(m.to)==='e8'&&m.promotion==='q');
p=Chess.applyMove(p,promotion);
assert(p.board[Chess.square('e8')]==='wq','queen promotion execution failed');
console.log('✓ Special-move execution: castling, en passant, queen promotion');

// Terminal positions and official draw-claim/automatic-draw thresholds.
let mate=fromFen('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1');
let terminal=Chess.gameState(mate);
assert(terminal.over && terminal.result==='white' && terminal.reason==='Checkmate','checkmate detection failed');
let stale=fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
terminal=Chess.gameState(stale);
assert(terminal.over && terminal.result==='draw' && terminal.reason==='Stalemate','stalemate detection failed');
let claim50=fromFen('r6k/8/8/8/8/8/8/R6K w - - 100 51');
terminal=Chess.gameState(claim50);
assert(!terminal.over && terminal.claimable==='50-Move Rule','50-move claim threshold failed');
let auto75=fromFen('r6k/8/8/8/8/8/8/R6K w - - 150 76');
terminal=Chess.gameState(auto75);
assert(terminal.over && terminal.reason==='75-Move Rule','75-move automatic draw failed');
let claimRep=Chess.gameState(Chess.initialPosition(),3);
assert(!claimRep.over && claimRep.claimable==='Threefold Repetition','threefold claim threshold failed');
let autoRep=Chess.gameState(Chess.initialPosition(),5);
assert(autoRep.over && autoRep.reason==='Fivefold Repetition','fivefold automatic draw failed');
console.log('✓ Terminal states and draw rules: checkmate, stalemate, claimable draws, automatic draws');

// All difficulty settings must return a legal move.
for (const level of ['easy','medium','hard']) {
  const pos=Chess.initialPosition(), move=Chess.bestMove(pos,level);
  assert(move && Chess.legalMoves(pos).some(m=>m.from===move.from&&m.to===move.to&&m.promotion===move.promotion),`${level} AI returned an illegal move`);
  console.log(`✓ ${level[0].toUpperCase()+level.slice(1)} AI returns a legal move (${Chess.coord(move.from)}${Chess.coord(move.to)})`);
}

// SAN, repetition identity, and mate suffix.
let fool=Chess.initialPosition();
function sanPlay(pos,from,to){
  const legal=Chess.legalMoves(pos),m=legal.find(x=>Chess.coord(x.from)===from&&Chess.coord(x.to)===to);
  assert(m,`SAN sequence move ${from}${to} not legal`);
  const san=Chess.moveToSAN(pos,m,legal);return [Chess.applyMove(pos,m),san];
}
let san;
[fool,san]=sanPlay(fool,'f2','f3');assert(san==='f3','incorrect pawn SAN');
[fool,san]=sanPlay(fool,'e7','e5');
[fool,san]=sanPlay(fool,'g2','g4');
[fool,san]=sanPlay(fool,'d8','h4');
assert(san==='Qh4#','checkmate SAN suffix missing');
assert(Chess.gameState(fool).reason==='Checkmate','Fool\'s Mate should end in checkmate');
const epNotCapturableA=fromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
const epNotCapturableB=fromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
assert(Chess.positionKey(epNotCapturableA)===Chess.positionKey(epNotCapturableB),'irrelevant en-passant square changed repetition key');
console.log('✓ SAN notation, checkmate suffix, and en-passant repetition identity');
