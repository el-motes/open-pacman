// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS, SCATTER_CORNERS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

const SCATTER_FRAMES = 420; // 7s a 60fps
const CHASE_FRAMES = 1200;  // 20s a 60fps
const FRIGHT_FRAMES = 360;  // 6s a 60fps
const FRIGHT_SPEED = 0.05; // mitad de GHOST_SPEED
const EXIT_DELAY = { pinky: 120, inky: 360, clyde: 540 }; // ~2s/6s/9s

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 || v === 4 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    frame: 0,
    mode: 'scatter',
    modeTimer: SCATTER_FRAMES,
    frightTimer: 0,  // frames restantes de modo asustado (0 = inactivo)
    frightChain: 0,  // fantasmas comidos durante este frightened
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      releaseAt: g.kind === 'blinky' ? 0 : EXIT_DELAY[ g.kind ],
      released: g.kind === 'blinky',
      eyes: false,
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   puerta (3): solida para todos — fantasmas liberados no re-entran al pen.
//   Salida del pen via exitPen, que mueve manualmente sin canMove.
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Comer pellet: activa modo asustado y reinicia la cadena.
    if ( grid[ p.y ][ p.x ] === 4 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 50;
      game.dotsRemaining--;
      game.frightTimer = FRIGHT_FRAMES;
      game.frightChain = 0;
      // Los fantasmas sueltos (no ojos) invierten direccion.
      game.ghosts.forEach( ( g ) => {
        if ( g.released && !g.eyes ) g.dir = OPPOSITE[ g.dir ];
      } );
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

function decideGhost( game, g ) {
  const grid = game.grid;
  const p = game.pacman;

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  // Target segun modo y personalidad. Puede caer en muro o fuera del
  // tablero: solo se usa para distancia Manhattan, no necesita ser transitable.
  const px = Math.round( p.x );
  const py = Math.round( p.y );
  const pd = DIRS[ p.dir ];
  const corner = SCATTER_CORNERS[ g.kind ];
  let tx;
  let ty;

  if ( game.mode === 'scatter' ) {
    tx = corner.x;
    ty = corner.y;
  } else if ( g.kind === 'blinky' ) {
    tx = px;
    ty = py;
  } else if ( g.kind === 'pinky' ) {
    tx = px + pd.x * 4;
    ty = py + pd.y * 4;
  } else if ( g.kind === 'inky' ) {
    const b = game.ghosts.find( ( gh ) => gh.kind === 'blinky' );
    tx = 2 * ( px + pd.x * 2 ) - Math.round( b.x );
    ty = 2 * ( py + pd.y * 2 ) - Math.round( b.y );
  } else {
    // clyde: persigue lejos, vuelve a su esquina cerca.
    if ( Math.abs( g.x - px ) + Math.abs( g.y - py ) > 8 ) {
      tx = px;
      ty = py;
    } else {
      tx = corner.x;
      ty = corner.y;
    }
  }

  // Direccion valida (sin reversa) que minimiza distancia Manhattan al target.
  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const dist = Math.abs( g.x + d.x - tx ) + Math.abs( g.y + d.y - ty );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  g.dir = best;
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

// Salida de la pocilga: centra en x=13, sube por la puerta (13,12) hasta
// (13,11) y marca released. El pen no bloquea fantasmas (solo pared 1).
function exitPen( g ) {
  if ( g.x !== 13 ) {
    const step = Math.sign( 13 - g.x ) * g.speed;
    g.x = Math.abs( step ) >= Math.abs( 13 - g.x ) ? 13 : g.x + step;
  } else if ( g.y > 11 ) {
    g.y = Math.max( 11, g.y - g.speed );
  } else {
    g.released = true;
    g.dir = 'left';
  }
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    // Re-escalonar liberaciones relativas al frame actual (tras perder vida).
    g.released = g.kind === 'blinky';
    g.releaseAt = game.frame + ( g.kind === 'blinky' ? 0 : EXIT_DELAY[ g.kind ] );
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  game.frame++;
  game.modeTimer--;
  if ( game.modeTimer <= 0 ) {
    game.mode = game.mode === 'scatter' ? 'chase' : 'scatter';
    game.modeTimer = game.mode === 'scatter' ? SCATTER_FRAMES : CHASE_FRAMES;
    // Los fantasmas sueltos invierten direccion al cambiar de modo.
    game.ghosts.forEach( ( g ) => {
      if ( g.released ) g.dir = OPPOSITE[ g.dir ];
    } );
  }

  movePacman( game );
  game.ghosts.forEach( ( g ) => {
    if ( g.released ) moveGhost( game, g );
    else if ( game.frame >= g.releaseAt ) exitPen( g );
  } );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
