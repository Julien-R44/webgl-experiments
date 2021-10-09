import * as gsap from 'gsap'
import * as THREE from 'three'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { SavePass } from 'three/examples/jsm/postprocessing/SavePass.js'
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js'
import { BlendShader } from 'three/examples/jsm/shaders/BlendShader.js'
import { Experiment } from '../Experiment'
import { randomInt, wait } from '../../utils'

type Direction = 1 | -1
interface Move {
  cube: THREE.Mesh
  axis: 'x' | 'y' | 'z'
  direction: Direction
}

class Rubiks extends Experiment {
  movesDones: Move[] = []
  cubes: THREE.Mesh[] = []
  activeGroup: THREE.Mesh[] = []
  pivot: THREE.Group
  blendPass!: ShaderPass

  parameters = {
    shuffleAnimationDuration: 0.2,
    blendRatio: 0.8,
  }

  constructor() {
    super({
      withOrbitControls: true,
      withIcoBackground: true,
      icoBackground: [
        [0.75, 0.6, 0.4],
        ['#4158D0', '#C850C0', '#FFCC70'],
      ],
      cameraOptions: {
        far: 10000,
      },
    })

    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.scene.fog = new THREE.Fog(0x565b5e, 0, 100)

    this.camera.position.set(7, 7, 7)
    this.camera.lookAt(0, 0, 0)

    this.pivot = new THREE.Group()
    this.scene.add(this.pivot)

    this.controls.enableDamping = true

    this.addLight()
    this.generateRubiks()
    this.addMovementBlurPostProcessing()
    this.addGuiParams()
    this.render()
  }

  addLight() {
    this.scene.add(new THREE.AmbientLight(0x3d4143))

    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(300, 1000, 500)
    light.target.position.set(0, 0, 0)
    light.castShadow = true
    const d = 300
    light.shadow.camera = new THREE.OrthographicCamera(-d, d, d, -d, 500, 16000)
    light.shadow.bias = 0.01
    light.shadow.mapSize.width = light.shadow.mapSize.height = 1024
    this.scene.add(light)
  }

  addMovementBlurPostProcessing() {
    const renderTargetParameters = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      stencilBuffer: false,
    }

    const savePass = new SavePass(
      new THREE.WebGLRenderTarget(
        document.body.clientWidth,
        document.body.clientHeight,
        renderTargetParameters
      )
    )

    this.blendPass = new ShaderPass(BlendShader, 'tDiffuse1')
    this.blendPass.uniforms['tDiffuse2'].value = savePass.renderTarget.texture
    this.blendPass.uniforms['mixRatio'].value = this.parameters.blendRatio

    const outputPass = new ShaderPass(CopyShader)
    outputPass.renderToScreen = true

    this.composer.addPass(this.blendPass)
    this.composer.addPass(savePass)
    this.composer.addPass(outputPass)
  }

  async generateRubiks() {
    const geometry = new THREE.BoxGeometry(1, 1, 1)

    this.cubes = []
    const RUBIKS_SIZE = 4
    const SPACING = 1.1

    const colours = [0xc41e3a, 0x88ea00, 0x14f7ff, 0xff5800, 0xffd500, 0xffffff]
    const faceMaterials = colours.map((c) => new THREE.MeshBasicMaterial({ color: c }))

    for (let i = 0; i < RUBIKS_SIZE; i++) {
      for (let j = 0; j < RUBIKS_SIZE; j++) {
        for (let k = 0; k < RUBIKS_SIZE; k++) {
          const cube = new THREE.Mesh(geometry, faceMaterials)
          cube.castShadow = true
          cube.receiveShadow = true

          const positionOffset = (RUBIKS_SIZE - 1) / 2
          const x = (i - positionOffset) * SPACING
          const y = (j - positionOffset) * SPACING
          const z = (k - positionOffset) * SPACING

          cube.scale.set(0.1, 0.1, 0.1)

          await wait(5)

          gsap.gsap
            .to(cube.position, { y, x, z, duration: 1, ease: gsap.Power3.easeInOut })
            .then(() => {
              gsap.gsap.to(cube.scale, { x: 1, y: 1, z: 1, ease: gsap.Power4.easeOut })
            })

          this.scene.add(cube)
          this.cubes.push(cube)
        }
      }
    }
  }

  nearlyEqual(a: number, b: number, d = 0.001) {
    return Math.abs(a - b) <= d
  }

  getCubeGroup(selectedCube: THREE.Mesh, axis: 'x' | 'y' | 'z'): THREE.Mesh[] {
    return this.cubes.filter((c) => this.nearlyEqual(selectedCube.position[axis], c.position[axis]))
  }

  getRandomCube() {
    return this.cubes[Math.floor(Math.random() * this.cubes.length)]
  }

  randomAxis(): 'x' | 'y' | 'z' {
    return ['x', 'y', 'z'][randomInt(0, 2)] as 'x' | 'y' | 'z'
  }

  randomDirection(): Direction {
    let x = randomInt(0, 1)
    if (x == 0) x = -1
    return x as Direction
  }

  addGuiParams() {
    const obj = {
      resolve: async () => {
        const moves = [...this.movesDones].reverse()
        for (const move of moves) {
          await this.rotate(move.cube, move.axis, -move.direction as Direction, false)
        }

        this.movesDones = []
      },

      shuffle: async () => {
        for (let i = 0; i < randomInt(20, 30); i++) {
          await this.rotate(this.getRandomCube(), this.randomAxis(), this.randomDirection())
        }
      },
    }

    this.gui.add(obj, 'shuffle')
    this.gui.add(obj, 'resolve')

    this.gui.add(this.parameters, 'shuffleAnimationDuration').min(0).max(3).step(0.1)
    this.gui
      .add(this.parameters, 'blendRatio')
      .min(0)
      .max(0.99)
      .step(0.01)
      .onChange(() => (this.blendPass.uniforms['mixRatio'].value = this.parameters.blendRatio))
  }

  rotate(cube: THREE.Mesh, axis: 'x' | 'y' | 'z', direction: Direction, addToMoves = true) {
    const group = this.getCubeGroup(cube, axis)
    this.activeGroup = group
    this.pivot.rotation.set(0, 0, 0)
    this.pivot.updateMatrixWorld()

    group.forEach((c) => this.pivot.attach(c))

    if (addToMoves) this.movesDones.push({ cube, axis, direction })

    return gsap.gsap
      .to(this.pivot.rotation, {
        [axis]: (Math.PI / 2) * direction,
        duration: this.parameters.shuffleAnimationDuration,
        ease: gsap.Power3.easeOut,
      })
      .then(() => {
        this.pivot.updateMatrixWorld()
        group.forEach((cube) => this.scene.attach(cube))
      })
  }
}

new Rubiks()
