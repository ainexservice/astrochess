/* AstroMul Chess: self-contained legal chess rules + compact alpha-beta opponent. */
(() => {
  'use strict';
  const FILES = 'abcdefgh';
  const VALUES = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 20000 };
  const KNIGHT = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  const KING = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const BISHOP = [[-1,-1],[-1,1],[1,-1],[1,1]];
  const ROOK = [[-1,0],[1,0],[0,-1],[0,1]];
  const inside = (r,c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const colorOf = p => p ? p[0] : null;
  const typeOf = p => p ? p[1] : null;
  const opposite = c => c === 'w' ? 'b' : 'w';
  const coord = sq => FILES[sq % 8] + (8 - Math.floor(sq / 8));
  const square = name => (8 - Number(name[1])) * 8 + FILES.indexOf(name[0]);
  const clone = p => ({ board: p.board.slice(), turn: p.turn, rights: { ...p.rights }, ep: p.ep, half: p.half, full: p.full });

  function initialPosition() {
    const board = Array(64).fill(null);
    const back = ['r','n','b','q','k','b','n','r'];
    for (let c = 0; c < 8; c++) {
      board[c] = 'b' + back[c]; board[8 + c] = 'bp';
      board[48 + c] = 'wp'; board[56 + c] = 'w' + back[c];
    }
    return { board, turn: 'w', rights: { K:true, Q:true, k:true, q:true }, ep: -1, half: 0, full: 1 };
  }

  function attacked(pos, target, byColor) {
    const b = pos.board, r = Math.floor(target / 8), c = target % 8;
    const pawnSourceRow = r + (byColor === 'w' ? 1 : -1);
    for (const dc of [-1,1]) if (inside(pawnSourceRow, c + dc) && b[pawnSourceRow*8+c+dc] === byColor+'p') return true;
    for (const [dr,dc] of KNIGHT) if (inside(r+dr,c+dc) && b[(r+dr)*8+c+dc] === byColor+'n') return true;
    for (const [dr,dc] of KING) if (inside(r+dr,c+dc) && b[(r+dr)*8+c+dc] === byColor+'k') return true;
    const rays = [[BISHOP,'b'],[ROOK,'r']];
    for (const [dirs, kind] of rays) for (const [dr,dc] of dirs) {
      let rr=r+dr, cc=c+dc;
      while (inside(rr,cc)) {
        const p=b[rr*8+cc];
        if (p) { if (colorOf(p)===byColor && (typeOf(p)===kind || typeOf(p)==='q')) return true; break; }
        rr+=dr; cc+=dc;
      }
    }
    return false;
  }
  function inCheck(pos, color) {
    const king = pos.board.indexOf(color+'k');
    return king < 0 || attacked(pos, king, opposite(color));
  }

  function pseudoMoves(pos, color = pos.turn) {
    const b = pos.board, moves = [];
    const add = (from,to,extra={}) => moves.push({ from,to,...extra });
    for (let from=0; from<64; from++) {
      const p=b[from]; if (!p || colorOf(p)!==color) continue;
      const type=typeOf(p), r=from>>3, c=from&7;
      if (type==='p') {
        const step = color==='w' ? -1 : 1, start=color==='w'?6:1, last=color==='w'?0:7;
        const nr=r+step;
        if (inside(nr,c) && !b[nr*8+c]) {
          if (nr===last) for (const promotion of ['q','r','b','n']) add(from,nr*8+c,{promotion});
          else {
            add(from,nr*8+c);
            const nr2=r+2*step;
            if (r===start && !b[nr2*8+c]) add(from,nr2*8+c,{double:true});
          }
        }
        for (const dc of [-1,1]) {
          const rr=r+step, cc=c+dc; if (!inside(rr,cc)) continue;
          const to=rr*8+cc, target=b[to];
          if (target && colorOf(target)!==color && typeOf(target)!=='k') {
            if (rr===last) for (const promotion of ['q','r','b','n']) add(from,to,{promotion}); else add(from,to);
          } else if (to===pos.ep) add(from,to,{epCapture:true});
        }
      } else if (type==='n' || type==='k') {
        for (const [dr,dc] of (type==='n'?KNIGHT:KING)) {
          const rr=r+dr,cc=c+dc; if (!inside(rr,cc)) continue;
          const to=rr*8+cc;
          if (!b[to] || (colorOf(b[to])!==color && typeOf(b[to])!=='k')) add(from,to);
        }
        if (type==='k' && !inCheck(pos,color)) {
          const row=color==='w'?7:0, rank=color==='w'?'K':'k', qrank=color==='w'?'Q':'q';
          if (pos.rights[rank] && !b[row*8+5] && !b[row*8+6] && !attacked(pos,row*8+5,opposite(color)) && !attacked(pos,row*8+6,opposite(color)) && b[row*8+7]===color+'r') add(from,row*8+6,{castle:'K'});
          if (pos.rights[qrank] && !b[row*8+1] && !b[row*8+2] && !b[row*8+3] && !attacked(pos,row*8+3,opposite(color)) && !attacked(pos,row*8+2,opposite(color)) && b[row*8]===color+'r') add(from,row*8+2,{castle:'Q'});
        }
      } else {
        const dirs=type==='b'?BISHOP:type==='r'?ROOK:[...BISHOP,...ROOK];
        for (const [dr,dc] of dirs) {
          let rr=r+dr,cc=c+dc;
          while (inside(rr,cc)) {
            const to=rr*8+cc;
            if (!b[to]) add(from,to);
            else { if (colorOf(b[to])!==color && typeOf(b[to])!=='k') add(from,to); break; }
            rr+=dr;cc+=dc;
          }
        }
      }
    }
    return moves;
  }

  function applyMove(pos, move) {
    const next=clone(pos), b=next.board, piece=b[move.from], color=colorOf(piece), type=typeOf(piece);
    const captured = move.epCapture ? b[move.to + (color==='w'?8:-8)] : b[move.to];
    b[move.from]=null;
    if (move.epCapture) b[move.to + (color==='w'?8:-8)]=null;
    b[move.to]=move.promotion ? color+move.promotion : piece;
    if (move.castle) {
      const row=color==='w'?7:0;
      if (move.castle==='K') { b[row*8+5]=b[row*8+7]; b[row*8+7]=null; }
      else { b[row*8+3]=b[row*8]; b[row*8]=null; }
    }
    if (type==='k') { if(color==='w'){next.rights.K=false;next.rights.Q=false;}else{next.rights.k=false;next.rights.q=false;} }
    if (move.from===63 || move.to===63) next.rights.K=false;
    if (move.from===56 || move.to===56) next.rights.Q=false;
    if (move.from===7 || move.to===7) next.rights.k=false;
    if (move.from===0 || move.to===0) next.rights.q=false;
    next.ep=move.double ? (move.from+move.to)/2 : -1;
    next.half=(type==='p'||captured)?0:next.half+1;
    if (color==='b') next.full++;
    next.turn=opposite(color);
    return next;
  }
  function legalMoves(pos, color=pos.turn) {
    return pseudoMoves(pos,color).filter(m => !inCheck(applyMove(pos,m),color));
  }
  function moveToSAN(pos, move, allLegal) {
    const p=pos.board[move.from], type=typeOf(p), capture=!!pos.board[move.to]||!!move.epCapture;
    if(move.castle) {
      let notation=move.castle==='K'?'O-O':'O-O-O';
      const next=applyMove(pos,move);
      if(inCheck(next,next.turn)) notation+=legalMoves(next).length?'+':'#';
      return notation;
    }
    let s=type==='p'?(capture?FILES[move.from%8]:''):type.toUpperCase();
    if(type!=='p') {
      const rivals=allLegal.filter(m=>m.to===move.to && m.from!==move.from && typeOf(pos.board[m.from])===type);
      if(rivals.length){const sameFile=rivals.some(m=>m.from%8===move.from%8);const sameRank=rivals.some(m=>(m.from>>3)===(move.from>>3));s+=!sameFile?FILES[move.from%8]:!sameRank?String(8-(move.from>>3)):coord(move.from);}
    }
    if(capture)s+='x'; s+=coord(move.to); if(move.promotion)s+='='+move.promotion.toUpperCase();
    const next=applyMove(pos,move); if(inCheck(next,next.turn)) s+=legalMoves(next).length?'+':'#';
    return s;
  }
  // En-passant only changes repetition identity when a legal en-passant capture exists.
  function positionKey(pos) {
    const epAvailable = pos.ep >= 0 && legalMoves(pos).some(move => move.epCapture);
    return pos.board.map(p=>p||'--').join('')+'|'+pos.turn+'|'+Object.keys(pos.rights).filter(k=>pos.rights[k]).join('')+'|'+(epAvailable?pos.ep:-1);
  }
  function insufficientMaterial(pos) {
    const pieces=pos.board.filter(p=>p && typeOf(p)!=='k');
    if(!pieces.length)return true;
    if(pieces.length===1 && ['b','n'].includes(typeOf(pieces[0])))return true;
    if(pieces.every(p=>typeOf(p)==='b')) {
      const squares=pos.board.map((p,i)=>p&&typeOf(p)==='b'?((i>>3)+(i&7))%2:null).filter(x=>x!==null);
      return squares.every(x=>x===squares[0]);
    }
    return false;
  }
  function gameState(pos, repetitionCount=1) {
    const moves=legalMoves(pos), check=inCheck(pos,pos.turn);
    if(!moves.length) return { over:true, result:check?(pos.turn==='w'?'black':'white'):'draw', reason:check?'Checkmate':'Stalemate', check, moves };
    if(insufficientMaterial(pos)) return {over:true,result:'draw',reason:'Insufficient Material',check,moves};
    // FIDE automatic draws: 75 moves without a pawn move/capture, or fivefold repetition.
    if(pos.half>=150) return {over:true,result:'draw',reason:'75-Move Rule',check,moves};
    if(repetitionCount>=5) return {over:true,result:'draw',reason:'Fivefold Repetition',check,moves};
    const claimable=pos.half>=100?'50-Move Rule':repetitionCount>=3?'Threefold Repetition':null;
    return {over:false,check,moves,claimable};
  }

  function evaluateWhite(pos) {
    let score=0, nonKings=0, phase=0;
    for(let i=0;i<64;i++){
      const p=pos.board[i]; if(!p)continue;
      const color=colorOf(p), type=typeOf(p), sign=color==='w'?1:-1, r=i>>3,c=i&7;
      if(type!=='k'){nonKings++;phase+=({q:4,r:2,b:1,n:1}[type]||0);}
      let positional=0;
      const center=(3.5-Math.abs(3.5-c))+(3.5-Math.abs(3.5-r));
      if(type==='p') positional=(color==='w'?(6-r):(r-1))*7 + (3.5-Math.abs(3.5-c))*2;
      if(type==='n') positional=center*7;
      if(type==='b') positional=center*4;
      if(type==='q') positional=center*1.5;
      if(type==='k') positional=phase<8?center*7:-(center*4);
      score += sign*(VALUES[type]+positional);
    }
    return score;
  }
  let searchNodes=0, searchDeadline=0, searchAborted=false;
  function orderedMoves(pos,moves){
    return moves.map(m=>{
      const victim=m.epCapture?'bp':pos.board[m.to], attacker=pos.board[m.from];
      const score=(victim?10*VALUES[typeOf(victim)]-VALUES[typeOf(attacker)]:0)+(m.promotion?VALUES[m.promotion]+800:0)+(m.castle?30:0);
      return {m,score};
    }).sort((a,b)=>b.score-a.score).map(x=>x.m);
  }
  function negamax(pos,depth,alpha,beta,ply,repCount=1){
    searchNodes++;
    if(searchNodes%512===0 && (searchNodes>130000 || performance.now()>searchDeadline)){searchAborted=true;return 0;}
    const moves=legalMoves(pos);
    if(!moves.length)return inCheck(pos,pos.turn)?-100000+ply:0;
    if(pos.half>=100||insufficientMaterial(pos)||repCount>=3)return 0;
    if(depth<=0)return (pos.turn==='w'?1:-1)*evaluateWhite(pos);
    let best=-Infinity;
    for(const m of orderedMoves(pos,moves)){
      const child=applyMove(pos,m);
      const score=-negamax(child,depth-1,-beta,-alpha,ply+1,1);
      if(searchAborted)return 0;
      if(score>best)best=score;
      if(score>alpha)alpha=score;
      if(alpha>=beta)break;
    }
    return best;
  }
  function bestMove(pos,level='medium'){
    const moves=legalMoves(pos); if(!moves.length)return null;
    const settings={easy:{depth:1,ms:90},medium:{depth:3,ms:500},hard:{depth:4,ms:1300}}[level]||{depth:3,ms:500};
    searchNodes=0;searchAborted=false;searchDeadline=performance.now()+settings.ms;
    const ranked=[]; let alpha=-Infinity;
    for(const m of orderedMoves(pos,moves)){
      const score=-negamax(applyMove(pos,m),settings.depth-1,-Infinity,-alpha,1);
      if(searchAborted)break;
      ranked.push({move:m,score}); if(score>alpha)alpha=score;
    }
    if(!ranked.length)return moves[Math.floor(Math.random()*moves.length)];
    ranked.sort((a,b)=>b.score-a.score);
    if(level==='easy'){
      const pool=ranked.filter(x=>x.score>=ranked[0].score-180).slice(0,Math.min(5,ranked.length));
      return pool[Math.floor(Math.random()*pool.length)].move;
    }
    return ranked[0].move;
  }

  window.AstroChess = { initialPosition, clone, legalMoves, applyMove, inCheck, attacked, gameState, bestMove, coord, square, moveToSAN, positionKey, colorOf, typeOf, opposite };
})();
