export type CubeMove =
  | 'U'
  | "U'"
  | 'D'
  | "D'"
  | 'L'
  | "L'"
  | 'R'
  | "R'"
  | 'F'
  | "F'"
  | 'B'
  | "B'"

export type CubeFace = 'U' | 'D' | 'L' | 'R' | 'F' | 'B'
type Axis = 'x' | 'y' | 'z'
type Direction = 'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz'

export type StickerColor = 'white' | 'yellow' | 'orange' | 'red' | 'green' | 'blue'

type Vector = { x: number; y: number; z: number }

type Cubie = {
  id: string
  position: Vector
  stickers: Partial<Record<Direction, StickerColor>>
}

export type CubeState = {
  cubies: Cubie[]
}

export type CubeGuide = {
  title: string
  detail: string
  nextMove: CubeMove | null
}

const directionVectors: Record<Direction, Vector> = {
  px: { x: 1, y: 0, z: 0 },
  nx: { x: -1, y: 0, z: 0 },
  py: { x: 0, y: 1, z: 0 },
  ny: { x: 0, y: -1, z: 0 },
  pz: { x: 0, y: 0, z: 1 },
  nz: { x: 0, y: 0, z: -1 }
}

const vectorToDirection = (vector: Vector): Direction => {
  return (Object.entries(directionVectors).find(([, value]) =>
    value.x === vector.x && value.y === vector.y && value.z === vector.z
  )?.[0] ?? 'px') as Direction
}

const faceCenterColor: Record<CubeFace, StickerColor> = {
  U: 'white',
  D: 'yellow',
  L: 'orange',
  R: 'red',
  F: 'green',
  B: 'blue'
}

const moveDefinitions: Record<CubeMove, { axis: Axis; layer: number; turns: 1 | -1 }> = {
  U: { axis: 'y', layer: 1, turns: -1 },
  "U'": { axis: 'y', layer: 1, turns: 1 },
  D: { axis: 'y', layer: -1, turns: 1 },
  "D'": { axis: 'y', layer: -1, turns: -1 },
  L: { axis: 'x', layer: -1, turns: 1 },
  "L'": { axis: 'x', layer: -1, turns: -1 },
  R: { axis: 'x', layer: 1, turns: -1 },
  "R'": { axis: 'x', layer: 1, turns: 1 },
  F: { axis: 'z', layer: 1, turns: -1 },
  "F'": { axis: 'z', layer: 1, turns: 1 },
  B: { axis: 'z', layer: -1, turns: 1 },
  "B'": { axis: 'z', layer: -1, turns: -1 }
}

export const cubeMoveButtons: CubeMove[] = ['U', "U'", 'R', "R'", 'F', "F'", 'L', "L'", 'D', "D'", 'B', "B'"]

export const cubeTutorialSteps = [
  'Keep one viewing convention: white on top and green in front.',
  'Build the white cross first and line up each side edge with its center color.',
  'Insert the white corners to finish the first layer.',
  'Use the common left and right insertion patterns for the four middle-layer edges.',
  'Finish with the yellow cross, yellow face, corner swap, and edge swap.'
]

const rotateVector = (vector: Vector, axis: Axis, turns: 1 | -1): Vector => {
  const { x, y, z } = vector
  if (axis === 'x') {
    return turns === 1 ? { x, y: -z, z: y } : { x, y: z, z: -y }
  }
  if (axis === 'y') {
    return turns === 1 ? { x: z, y, z: -x } : { x: -z, y, z: x }
  }
  return turns === 1 ? { x: -y, y: x, z } : { x: y, y: -x, z }
}

export const createSolvedCube = (): CubeState => {
  const cubies: Cubie[] = []

  for (const x of [-1, 0, 1]) {
    for (const y of [-1, 0, 1]) {
      for (const z of [-1, 0, 1]) {
        if (x === 0 && y === 0 && z === 0) continue
        const stickers: Partial<Record<Direction, StickerColor>> = {}
        if (x === 1) stickers.px = 'red'
        if (x === -1) stickers.nx = 'orange'
        if (y === 1) stickers.py = 'white'
        if (y === -1) stickers.ny = 'yellow'
        if (z === 1) stickers.pz = 'green'
        if (z === -1) stickers.nz = 'blue'

        cubies.push({
          id: `${x}${y}${z}`,
          position: { x, y, z },
          stickers
        })
      }
    }
  }

  return { cubies }
}

const rotateCubie = (cubie: Cubie, axis: Axis, turns: 1 | -1): Cubie => {
  const nextPosition = rotateVector(cubie.position, axis, turns)
  const nextStickers: Partial<Record<Direction, StickerColor>> = {}

  for (const [direction, color] of Object.entries(cubie.stickers) as Array<[Direction, StickerColor]>) {
    const rotated = rotateVector(directionVectors[direction], axis, turns)
    nextStickers[vectorToDirection(rotated)] = color
  }

  return {
    ...cubie,
    position: nextPosition,
    stickers: nextStickers
  }
}

export const applyCubeMove = (state: CubeState, move: CubeMove): CubeState => {
  const definition = moveDefinitions[move]

  return {
    cubies: state.cubies.map((cubie) => {
      if (cubie.position[definition.axis] !== definition.layer) {
        return {
          ...cubie,
          position: { ...cubie.position },
          stickers: { ...cubie.stickers }
        }
      }
      return rotateCubie(cubie, definition.axis, definition.turns)
    })
  }
}

export const applyCubeMoves = (state: CubeState, moves: CubeMove[]) =>
  moves.reduce((current, move) => applyCubeMove(current, move), state)

const getCubieAt = (state: CubeState, x: number, y: number, z: number) =>
  state.cubies.find((cubie) => cubie.position.x === x && cubie.position.y === y && cubie.position.z === z)

const faceLookup: Record<CubeFace, { direction: Direction; coords: Array<[number, number, number]> }> = {
  U: {
    direction: 'py',
    coords: [
      [-1, 1, -1], [0, 1, -1], [1, 1, -1],
      [-1, 1, 0], [0, 1, 0], [1, 1, 0],
      [-1, 1, 1], [0, 1, 1], [1, 1, 1]
    ]
  },
  D: {
    direction: 'ny',
    coords: [
      [-1, -1, 1], [0, -1, 1], [1, -1, 1],
      [-1, -1, 0], [0, -1, 0], [1, -1, 0],
      [-1, -1, -1], [0, -1, -1], [1, -1, -1]
    ]
  },
  F: {
    direction: 'pz',
    coords: [
      [-1, 1, 1], [0, 1, 1], [1, 1, 1],
      [-1, 0, 1], [0, 0, 1], [1, 0, 1],
      [-1, -1, 1], [0, -1, 1], [1, -1, 1]
    ]
  },
  B: {
    direction: 'nz',
    coords: [
      [1, 1, -1], [0, 1, -1], [-1, 1, -1],
      [1, 0, -1], [0, 0, -1], [-1, 0, -1],
      [1, -1, -1], [0, -1, -1], [-1, -1, -1]
    ]
  },
  R: {
    direction: 'px',
    coords: [
      [1, 1, 1], [1, 1, 0], [1, 1, -1],
      [1, 0, 1], [1, 0, 0], [1, 0, -1],
      [1, -1, 1], [1, -1, 0], [1, -1, -1]
    ]
  },
  L: {
    direction: 'nx',
    coords: [
      [-1, 1, -1], [-1, 1, 0], [-1, 1, 1],
      [-1, 0, -1], [-1, 0, 0], [-1, 0, 1],
      [-1, -1, -1], [-1, -1, 0], [-1, -1, 1]
    ]
  }
}

export const getCubeFace = (state: CubeState, face: CubeFace) => {
  const lookup = faceLookup[face]
  return lookup.coords.map(([x, y, z]) => {
    const cubie = getCubieAt(state, x, y, z)
    return cubie?.stickers[lookup.direction] ?? faceCenterColor[face]
  })
}

export const isCubeSolved = (state: CubeState) =>
  (Object.keys(faceLookup) as CubeFace[]).every((face) => {
    const colors = getCubeFace(state, face)
    return colors.every((color) => color === colors[0])
  })

export const countSolvedFaces = (state: CubeState) =>
  (Object.keys(faceLookup) as CubeFace[]).filter((face) => {
    const colors = getCubeFace(state, face)
    return colors.every((color) => color === colors[0])
  }).length

export const countSolvedStickers = (state: CubeState) =>
  (Object.keys(faceLookup) as CubeFace[]).reduce((total, face) => {
    const center = faceCenterColor[face]
    return total + getCubeFace(state, face).filter((color) => color === center).length
  }, 0)

export const invertCubeMove = (move: CubeMove): CubeMove => (move.endsWith("'") ? (move[0] as CubeMove) : `${move}'` as CubeMove)

export const generateCubeScramble = (length = 18): CubeMove[] => {
  const faces = ['U', 'D', 'L', 'R', 'F', 'B'] as const
  const scramble: CubeMove[] = []

  while (scramble.length < length) {
    const face = faces[Math.floor(Math.random() * faces.length)]
    const suffix = Math.random() > 0.5 ? "'" : ''
    const move = `${face}${suffix}` as CubeMove
    const last = scramble.at(-1)
    if (last && last[0] === move[0]) continue
    scramble.push(move)
  }

  return scramble
}

const getTopFaceCorrectCount = (state: CubeState) => getCubeFace(state, 'U').filter((color) => color === 'white').length
const getBottomFaceCorrectCount = (state: CubeState) => getCubeFace(state, 'D').filter((color) => color === 'yellow').length

const topLayerAligned = (state: CubeState) => {
  const front = getCubeFace(state, 'F').slice(0, 3).every((color) => color === 'green')
  const right = getCubeFace(state, 'R').slice(0, 3).every((color) => color === 'red')
  const back = getCubeFace(state, 'B').slice(0, 3).every((color) => color === 'blue')
  const left = getCubeFace(state, 'L').slice(0, 3).every((color) => color === 'orange')
  return front && right && back && left
}

const middleLayerAligned = (state: CubeState) => {
  const front = getCubeFace(state, 'F').slice(3, 6).every((color) => color === 'green')
  const right = getCubeFace(state, 'R').slice(3, 6).every((color) => color === 'red')
  const back = getCubeFace(state, 'B').slice(3, 6).every((color) => color === 'blue')
  const left = getCubeFace(state, 'L').slice(3, 6).every((color) => color === 'orange')
  return front && right && back && left
}

export const getCubeGuide = (state: CubeState, history: CubeMove[]): CubeGuide => {
  if (isCubeSolved(state)) {
    return {
      title: 'Cube Solved',
      detail: 'All six faces are solved. Scramble again for another round, or slowly walk back through your own solve path.',
      nextMove: null
    }
  }

  const rewindMove = history.length ? invertCubeMove(history[history.length - 1]) : null
  const topCount = getTopFaceCorrectCount(state)
  const bottomCount = getBottomFaceCorrectCount(state)

  if (topCount < 5) {
    return {
      title: 'Step 1: Build The White Cross',
      detail: 'Focus only on the white edge pieces first. Bring them to the top layer, then line them up with the matching side centers.',
      nextMove: rewindMove
    }
  }

  if (topCount < 9 || !topLayerAligned(state)) {
    return {
      title: 'Step 2: Finish The First Layer',
      detail: 'The white face has a base now. Insert the white corners and finish matching the first layer around the sides.',
      nextMove: rewindMove
    }
  }

  if (!middleLayerAligned(state)) {
    return {
      title: 'Step 3: Insert Middle Edges',
      detail: 'Work on the middle-layer edges next. Decide whether the target edge needs the left or right insertion pattern, then execute it cleanly.',
      nextMove: rewindMove
    }
  }

  if (bottomCount < 5) {
    return {
      title: 'Step 4: Make The Yellow Cross',
      detail: 'Pay attention only to the yellow orientation on the bottom face for now. Build the yellow cross before you worry about the corners.',
      nextMove: rewindMove
    }
  }

  if (bottomCount < 9) {
    return {
      title: 'Step 5: Orient Last Layer',
      detail: 'The yellow face is not fully oriented yet. Keep working the last-layer orientation patterns until all nine yellow stickers face up.',
      nextMove: rewindMove
    }
  }

  return {
    title: 'Step 6: Permute The Last Layer',
    detail: 'Orientation is nearly done. The final stage is swapping the last-layer corners and edges into their correct positions.',
    nextMove: rewindMove
  }
}
