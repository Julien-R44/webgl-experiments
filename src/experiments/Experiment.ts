import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import dat from 'dat.gui'

interface ExperimentParameters {
  withOrbitControls?: boolean
  withBloomPass?: boolean
}

export abstract class Experiment {
  scene!: THREE.Scene
  camera!: THREE.PerspectiveCamera
  renderer!: THREE.WebGLRenderer
  composer!: EffectComposer
  controls: OrbitControls | null = null
  clock: THREE.Clock = new THREE.Clock()
  mouse: THREE.Vector2 = new THREE.Vector2()
  gui!: dat.GUI
  guiParams: any

  public constructor(args: ExperimentParameters = {}) {
    this.createScene()

    this.gui = new dat.GUI()

    this.createPostProcessing(args)

    if (args.withOrbitControls) {
      this.createOrbitControls()
    }
  }

  private createScene(): void {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(this.renderer.domElement)

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })
  }

  private createOrbitControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    const onDocumentMouseMove = (event: MouseEvent) => {
      event.preventDefault()
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
    }
    document.addEventListener('mousemove', onDocumentMouseMove, false)
  }

  private createPostProcessing(args: ExperimentParameters): void {
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))

    if (args.withBloomPass) {
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,
        0.4,
        0.85
      )
      this.guiParams = {
        exposure: 1.1,
        bloomStrength: 1.7,
        bloomThreshold: 0.4,
        bloomRadius: 0.84,
      }
      bloomPass.threshold = this.guiParams.bloomThreshold
      bloomPass.strength = this.guiParams.bloomStrength
      bloomPass.radius = this.guiParams.bloomRadius
      this.composer.addPass(bloomPass)

      this.gui.add(this.guiParams, 'exposure', 0.1, 2).onChange((value) => {
        this.renderer.toneMappingExposure = Math.pow(value, 4.0)
      })

      this.gui.add(this.guiParams, 'bloomThreshold', 0.0, 1.0).onChange((value) => {
        bloomPass.threshold = Number(value)
      })

      this.gui.add(this.guiParams, 'bloomStrength', 0.0, 3.0).onChange((value) => {
        bloomPass.strength = Number(value)
      })

      this.gui
        .add(this.guiParams, 'bloomRadius', 0.0, 1.0)
        .step(0.01)
        .onChange((value) => {
          bloomPass.radius = Number(value)
        })
    }
  }

  public render(): void {
    const render = () => {
      requestAnimationFrame(render)

      this.beforeRender()

      if (this.controls) this.controls.update()

      this.composer.render()
    }
    render()
  }

  protected beforeRender(): void {
    // Override this method to add custom logic
  }
}
