import { Experiment } from '../Experiment'
import * as THREE from 'three'
import * as gsap from 'gsap'
import { randomFloat, randomInt } from '../utils'

enum CellState {
  LIVE = 'LIVE',
  DEAD = 'DEAD',
}

const makeColorTransition = (src: THREE.Color, dest: THREE.Color, duration: number) => {
  return gsap.gsap.to(src, {
    r: dest.r,
    g: dest.g,
    b: dest.b,
    duration,
  })
}

const randomHotColor = () => {
  const majorColor = randomInt(0, 2)
  const secondMajorColor = randomInt(0, 2)

  const genColor = (idx: number) => {
    if (majorColor === idx) {
      return randomFloat(0.7, 0.8)
    }

    if (secondMajorColor === idx) {
      return randomFloat(0.4, 0.5)
    }

    return randomFloat(0, 0.1)
  }

  return new THREE.Color(genColor(0), genColor(1), genColor(2))
}

class Cell {
  state: CellState = CellState.DEAD
  mesh!: THREE.Mesh
  rowIndex!: number
  cellIndex!: number

  async changeState(state: CellState) {
    this.state = state

    if (this.state === CellState.LIVE) {
      if (PARAMETERS.moveUpCells) {
        gsap.gsap.to(this.mesh.position, {
          y: Math.random() * 3,
        })
      }
      makeColorTransition(
        this.mesh.material.color,
        PARAMETERS.randomCellColor ? randomHotColor() : new THREE.Color(PARAMETERS.cellLiveColor),
        PARAMETERS.cellTransitionDuration
      )
    } else if (this.state === CellState.DEAD) {
      gsap.gsap.to(this.mesh.position, {
        y: 0,
      })
      makeColorTransition(
        this.mesh.material.color,
        new THREE.Color(0x0f0000),
        PARAMETERS.cellTransitionDuration
      )
    }
  }
}

const PARAMETERS = {
  gridWidth: 50,
  gridHeight: 50,
  cellSize: 0.5,
  cellPadding: 0.8,
  cellTransitionDuration: 0.3,
  running: true,
  moveUpCells: true,
  randomCellColor: true,
  cellLiveColor: 0x8c4444,
}

class GameOfLife extends Experiment {
  grid: Cell[][] = []

  constructor() {
    super({
      withBloomPass: true,
      withFpsCounter: true,
      defaultBloomParams: {
        exposure: 0.8,
        bloomThreshold: 0.15,
        bloomStrength: 0.9,
      },
      withOrbitControls: true,
    })

    this.camera.position.set(30, 12, 24)
    this.camera.lookAt(0, 0, 0)

    this.initGrid()
    this.activateRandomCells()
    this.addGui()
    this.render()

    document.addEventListener('pointerdown', this.onMouseDown.bind(this), false)

    setInterval(() => {
      if (PARAMETERS.running) this.updateLife()
    }, 100)
  }

  initGrid() {
    const { cellSize, cellPadding, gridHeight, gridWidth } = PARAMETERS
    this.grid = new Array(gridHeight)
      .fill(0)
      .map(() => new Array(gridWidth).fill(0).map(() => new Cell()))

    const cube = new THREE.BoxGeometry(cellSize, cellSize, cellSize)

    const startX = (-gridWidth * cellPadding) / 2
    const startY = (-gridHeight * cellPadding) / 2

    this.iterateGrid((row, cell, rowIndex, cellIndex) => {
      const material = new THREE.MeshBasicMaterial({ color: 0x0f0000 })
      const cubeMesh = new THREE.Mesh(cube, material)
      cubeMesh.position.set(startX + cellIndex * cellPadding, 0, startY + rowIndex * cellPadding)
      cell.cellIndex = cellIndex
      cell.rowIndex = rowIndex
      cell.mesh = cubeMesh
      this.scene.add(cubeMesh)
    })
  }

  iterateGrid(cb: (row: Cell[], cell: Cell, rowIndex: number, cellIndex: number) => void) {
    this.grid.forEach((row, rowIndex) =>
      row.forEach((cell, cellIndex) => {
        cb(row, cell, rowIndex, cellIndex)
      })
    )
  }

  activateRandomCells() {
    this.iterateGrid((row, cell, rowIndex, cellIndex) => {
      if (Math.random() > 0.9) {
        cell.changeState(CellState.LIVE)
      }
    })
  }

  getLiveNeighbors(rowIndex: number, cellIndex: number) {
    let liveNeighbors = 0

    const neighbors = [
      [rowIndex - 1, cellIndex - 1],
      [rowIndex - 1, cellIndex],
      [rowIndex - 1, cellIndex + 1],
      [rowIndex, cellIndex - 1],
      [rowIndex, cellIndex + 1],
      [rowIndex + 1, cellIndex - 1],
      [rowIndex + 1, cellIndex],
      [rowIndex + 1, cellIndex + 1],
    ]

    neighbors.forEach(([row, cell]) => {
      if (row >= 0 && row < this.grid.length && cell >= 0 && cell < this.grid[0].length) {
        if (this.grid[row][cell].state === CellState.LIVE) {
          liveNeighbors++
        }
      }
    })

    return liveNeighbors
  }

  updateLife() {
    this.iterateGrid((row, cell, rowIndex, cellIndex) => {
      const liveNeighbors = this.getLiveNeighbors(rowIndex, cellIndex)

      if (cell.state === CellState.LIVE) {
        if (liveNeighbors < 2) {
          cell.changeState(CellState.DEAD)
        } else if (liveNeighbors > 3) {
          cell.changeState(CellState.DEAD)
        }
      } else {
        if (liveNeighbors === 3) {
          cell.changeState(CellState.LIVE)
        }
      }
    })
  }

  getCellIntersected(mesh: THREE.Mesh): Cell | null {
    let foundCell = null
    this.iterateGrid((row, cell, rowIndex, cellIndex) => {
      if (cell.mesh === mesh) foundCell = cell
    })
    return foundCell
  }

  onMouseDown() {
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = raycaster.intersectObjects(this.scene.children)
    if (intersects.length > 0 && intersects[0].object.type === 'Mesh') {
      const cell = this.getCellIntersected(intersects[0].object as THREE.Mesh)
      if (!cell) return
      cell.changeState(cell.state === CellState.LIVE ? CellState.DEAD : CellState.LIVE)
    }
  }

  reset() {
    this.iterateGrid((row, cell, rowIndex, cellIndex) => {
      cell.changeState(CellState.DEAD)
    })
  }

  resetPositionAndColors() {
    this.iterateGrid((row, cell, rowIndex, cellIndex) => {
      cell.changeState(cell.state)
    })
  }

  addGui() {
    const fn = this.resetPositionAndColors.bind(this)

    this.gui.add(PARAMETERS, 'cellTransitionDuration').min(0).max(3)
    this.gui.add(PARAMETERS, 'running')
    this.gui.add(PARAMETERS, 'moveUpCells').onFinishChange(fn)
    this.gui.add(PARAMETERS, 'randomCellColor').onFinishChange(fn)
    this.gui.addColor(PARAMETERS, 'cellLiveColor').onFinishChange(fn)
    this.gui.add(this, 'reset')
    this.gui.add(this, 'activateRandomCells')
    this.gui.add(this, 'updateLife')
  }
}

/*
 * rowIndex = 0 and cellIndex = 0 are the top right corner
 * row is right to left
 * cell is top to bottom
 */

new GameOfLife()
