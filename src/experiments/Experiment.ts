import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import dat from 'dat.gui'
import { SAOPass } from 'three/examples/jsm/postprocessing/SAOPass.js'
import { gradTexture } from '../utils'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { SavePass } from 'three/examples/jsm/postprocessing/SavePass.js'
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js'
import { BlendShader } from 'three/examples/jsm/shaders/BlendShader.js'

interface ExperimentParameters {
  withOrbitControls?: boolean
  withBloomPass?: boolean
  defaultBloomParams?: any
  defaultSAOParams?: any
  withSaoPass?: boolean
  withMovementBlurPass?: boolean
  withIcoBackground?: boolean
  icoBackground?: [number[], string[]]
  cameraOptions?: {
    far: number
  }
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
    this.createScene(args)

    this.gui = new dat.GUI()

    this.createPostProcessing(args)

    if (args.withOrbitControls) this.createOrbitControls()
    if (args.withIcoBackground) this.addIcoBackground(args)
  }

  private createScene(args: ExperimentParameters): void {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(
      90,
      window.innerWidth / window.innerHeight,
      0.1,
      args.cameraOptions?.far || 1000
    )
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
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
      const rect = this.renderer.domElement.getBoundingClientRect()
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    }
    document.addEventListener('mousemove', onDocumentMouseMove, false)
  }

  private createPostProcessing(args: ExperimentParameters): void {
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))

    if (args.withBloomPass) this.addBloomPass(args)
    if (args.withSaoPass) this.addSaoPass(args)
    if (args.withMovementBlurPass) this.addMovementBlurPass(args)
  }

  private addMovementBlurPass(args: ExperimentParameters) {
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

    const blendPass = new ShaderPass(BlendShader, 'tDiffuse1')
    blendPass.uniforms['tDiffuse2'].value = savePass.renderTarget.texture
    blendPass.uniforms['mixRatio'].value = 0

    const outputPass = new ShaderPass(CopyShader)
    outputPass.renderToScreen = true

    this.composer.addPass(blendPass)
    this.composer.addPass(savePass)
    this.composer.addPass(outputPass)
  }

  private addSaoPass(args: ExperimentParameters): void {
    const saoPass = new SAOPass(this.scene, this.camera, false)

    this.composer.addPass(saoPass)

    const folder = this.gui.addFolder('SAO')
    folder.add(saoPass, 'enabled')
    folder
      .add(saoPass.params, 'output', {
        'Beauty': SAOPass.OUTPUT.Beauty,
        'Beauty+SAO': SAOPass.OUTPUT.Default,
        'SAO': SAOPass.OUTPUT.SAO,
        'Depth': SAOPass.OUTPUT.Depth,
        'Normal': SAOPass.OUTPUT.Normal,
      })
      .onChange((value) => (saoPass.params.output = parseInt(value)))
    folder.add(saoPass.params, 'saoBias', -1, 1)
    folder.add(saoPass.params, 'saoIntensity', 0, 1)
    folder.add(saoPass.params, 'saoScale', 0, 10)
    folder.add(saoPass.params, 'saoKernelRadius', 1, 100)
    folder.add(saoPass.params, 'saoMinResolution', 0, 1)
    folder.add(saoPass.params, 'saoBlur')
    folder.add(saoPass.params, 'saoBlurRadius', 0, 200)
    folder.add(saoPass.params, 'saoBlurStdDev', 0.5, 150)
    folder.add(saoPass.params, 'saoBlurDepthCutoff', 0.0, 0.1)
  }

  private addBloomPass(args: ExperimentParameters) {
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,
      0.4,
      0.85
    )
    this.guiParams = args.defaultBloomParams || {
      exposure: 1.1,
      bloomStrength: 1.7,
      bloomThreshold: 0.4,
      bloomRadius: 0.84,
    }
    bloomPass.threshold = this.guiParams.bloomThreshold
    bloomPass.strength = this.guiParams.bloomStrength
    bloomPass.radius = this.guiParams.bloomRadius
    this.composer.addPass(bloomPass)

    const bloomFolder = this.gui.addFolder('Bloom')
    bloomFolder.add(bloomPass, 'enabled')
    bloomFolder.add(this.guiParams, 'exposure', 0.1, 2).onChange((value) => {
      this.renderer.toneMappingExposure = Math.pow(value, 4.0)
    })
    bloomFolder.add(this.guiParams, 'bloomThreshold', 0.0, 1.0).onChange((value) => {
      bloomPass.threshold = Number(value)
    })
    bloomFolder.add(this.guiParams, 'bloomStrength', 0.0, 3.0).onChange((value) => {
      bloomPass.strength = Number(value)
    })
    bloomFolder
      .add(this.guiParams, 'bloomRadius', 0.0, 1.0)
      .step(0.01)
      .onChange((value) => {
        bloomPass.radius = Number(value)
      })
  }

  private addIcoBackground(args: ExperimentParameters) {
    const gem = new THREE.IcosahedronGeometry(3000, 2)
    const params = args.icoBackground || [
      [0.75, 0.6, 0.4, 0.25],
      ['#1B1D1E', '#3D4143', '#72797D', '#b0babf'],
    ]
    const material = new THREE.MeshBasicMaterial({
      map: gradTexture(params),
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    })

    this.scene.add(new THREE.Mesh(gem, material))
  }

  public render(): void {
    const render = () => {
      requestAnimationFrame(render)

      if (this.controls) this.controls.update()

      this.beforeRender()

      this.composer.render()
    }
    render()
  }

  protected beforeRender(): void {
    // Override this method to add custom logic
  }
}
