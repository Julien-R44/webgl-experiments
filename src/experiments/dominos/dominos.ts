import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import * as CANNON from 'cannon-es'
import { BufferGeometry, CatmullRomCurve3, Euler, Vector3 } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { SAOPass } from 'three/examples/jsm/postprocessing/SAOPass.js'
import * as gsap from 'gsap'

/**
 * Debug
 */
const cameraTarget = new THREE.Object3D()

let runStarted = false
let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.Camera
let firstCamera: THREE.Camera
let line: THREE.Line
let count = 0
const mouse = new THREE.Vector3()
let controls: OrbitControls
let plane: THREE.Mesh
const clock = new THREE.Clock()
let oldElapsedTime = 0
let renderScene: RenderPass
let composer: EffectComposer
let curve: THREE.CatmullRomCurve3
let curveObject: THREE.Line

let hasFinish = false

const MAX_POINTS = 500
const positions = new Float32Array(MAX_POINTS * 3)
const objectsToUpdate: { body: CANNON.Body; mesh: THREE.Mesh }[] = []

const world = new CANNON.World()
world.broadphase = new CANNON.NaiveBroadphase()
world.solver.iterations = 30
world.solver.tolerance = 0.01
world.allowSleep = true
world.gravity.set(0, -9.82, 0)
world.defaultContactMaterial.friction = 0.005

// Floor
const floorShape = new CANNON.Plane()
const floorBody = new CANNON.Body()
floorBody.mass = 0
floorBody.addShape(floorShape)
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5)
world.addBody(floorBody)

init()
animate()

function gradTexture(color) {
  const c = document.createElement('canvas')
  const ct = c.getContext('2d')
  c.width = 16
  c.height = 256
  const gradient = ct.createLinearGradient(0, 0, 0, 256)
  let i = color[0].length
  while (i--) {
    gradient.addColorStop(color[0][i], color[1][i])
  }
  ct.fillStyle = gradient
  ct.fillRect(0, 0, 16, 256)
  const texture = new THREE.Texture(c)
  texture.needsUpdate = true
  return texture
}

function basicTexture(n) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')
  const colors = []
  if (n === 0) {
    // sphere
    colors[0] = '#58AA80'
    colors[1] = '#58FFAA'
  }
  if (n === 1) {
    // sphere sleep
    colors[0] = '#383838'
    colors[1] = '#38AA80'
  }
  if (n === 2) {
    // box
    colors[0] = '#AA8058'
    colors[1] = '#FFAA58'
  }
  if (n === 3) {
    // box sleep
    colors[0] = '#383838'
    colors[1] = '#AA8038'
  }
  ctx.fillStyle = colors[0]
  ctx.fillRect(0, 0, 64, 64)
  ctx.fillStyle = colors[1]
  ctx.fillRect(0, 0, 32, 32)
  ctx.fillRect(32, 32, 32, 32)

  const tx = new THREE.Texture(canvas)
  tx.needsUpdate = true
  return tx
}

function init() {
  renderer = new THREE.WebGLRenderer()
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)
  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000)
  camera.position.set(10, 10, 10)
  camera.lookAt(0, 0, 0)

  firstCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000)
  firstCamera.position.set(20, 30, 20)
  firstCamera.lookAt(0, 0, 0)

  // geometry
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.LineBasicMaterial({
    color: 0xff0000,
    linewidth: 0,
  })
  line = new THREE.Line(geometry, material)
  line.position.y = -0.2
  scene.add(line)

  // add fog
  scene.fog = new THREE.Fog(0x565b5e, 0, 100)

  // plane
  const planeGeometry = new THREE.PlaneGeometry(400, 400, 1, 1)
  const planeMaterial = new THREE.MeshStandardMaterial({
    color: '#777777',
    metalness: 0.3,
    roughness: 0.4,
  })
  plane = new THREE.Mesh(planeGeometry, planeMaterial)
  plane.receiveShadow = true
  plane.rotation.x = -Math.PI / 2
  plane.position.y = 0
  scene.add(plane)

  renderScene = new RenderPass(scene, camera)

  composer = new EffectComposer(renderer)
  composer.addPass(renderScene)
  composer.addPass(new SAOPass(scene, camera))

  // var buffgeoBack = new THREE.BufferGeometry();
  const gem = new THREE.IcosahedronGeometry(3000, 2)
  const back = new THREE.Mesh(
    gem,
    new THREE.MeshBasicMaterial({
      map: gradTexture([
        [0.75, 0.6, 0.4, 0.25],
        ['#1B1D1E', '#3D4143', '#72797D', '#b0babf'],
      ]),
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    })
  )
  //back.geometry.applyMatrix(new THREE.Matrix4().makeRotationZ(15*ToRad));
  scene.add(back)

  /**
   * Lights
   */
  scene.add(new THREE.AmbientLight(0x3d4143))

  const light = new THREE.DirectionalLight(0xffffff, 1)
  light.position.set(300, 1000, 500)
  light.target.position.set(0, 0, 0)
  light.castShadow = true
  const d = 300
  light.shadow.camera = new THREE.OrthographicCamera(-d, d, d, -d, 500, 16000)
  light.shadow.bias = 0.01
  light.shadow.mapSize.width = light.shadow.mapSize.height = 1024
  scene.add(light)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enabled = false

  curve = new THREE.CatmullRomCurve3()

  // curve.closed = true
  // const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineDashedMaterial({
    color: 0xffffff,
    dashSize: 3,
    gapSize: 1,
  })

  mat.opacity = 0.5
  // Create the final object to add to the scene
  curveObject = new THREE.Line(geometry, mat)
  curveObject.position.y = 0.2
  scene.add(curveObject)

  document.addEventListener('mousemove', onMouseMove, false)
  document.addEventListener('mousedown', onMouseDown, false)
}

// update line
function updateLine(point: THREE.Vector3) {
  positions[count * 3 - 3] = point.x
  positions[count * 3 - 2] = point.y
  positions[count * 3 - 1] = point.z

  curve.points = convertFloat32ArrayToVector3(line.geometry.attributes.position.array)
  curveObject.geometry.attributes.position.needsUpdate = true
}

// mouse move handler
function onMouseMove(event) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
}

// add point
function addPoint(event) {
  //  raycast mouse to plane
  const raycaster = new THREE.Raycaster()
  let activeCamera = camera
  if (!hasFinish) {
    activeCamera = firstCamera
  }
  raycaster.setFromCamera(mouse, activeCamera)
  const intersects = raycaster.intersectObject(plane)
  if (intersects.length > 0) {
    positions[count * 3 + 0] = intersects[0].point.x
    positions[count * 3 + 1] = intersects[0].point.y
    positions[count * 3 + 2] = intersects[0].point.z
    count++
    line.geometry.setDrawRange(0, count)
    updateLine(intersects[0].point)
  }
}

// convert Float32Array to THREE.Vector3
function convertFloat32ArrayToVector3(array: ArrayLike<number>) {
  const vecs = []
  for (let i = 0; i < array.length; i += 3) {
    const vec = new THREE.Vector3(array[i], array[i + 1], array[i + 2])
    vecs.push(vec)
  }
  return vecs.filter((vector) => vector.x != 0 && vector.y != 0 && vector.z != 0)
}

const createDomino = (position: Vector3, rotation: Euler) => {
  const width = 0.6 * 2
  const height = 1 * 2
  const depth = 0.25 * 2

  // Three.js mesh
  const boxGeometry = new THREE.BoxGeometry(width, height, depth)
  const boxMaterial = new THREE.MeshPhongMaterial({
    map: basicTexture(1),
  })

  const mesh = new THREE.Mesh(boxGeometry, boxMaterial)
  // mesh.scale.set(width, height, depth)
  mesh.scale.set(width * 0.1, height * 0.1, depth * 0.1)
  // create random euler rotation
  const randomRotation = new THREE.Euler(
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2
  )

  mesh.rotation.set(randomRotation.x, randomRotation.y, randomRotation.z)

  gsap.gsap.to(mesh.scale, {
    x: width,
    y: height,
    z: depth,
    ease: 'power1.inOut',
  })

  gsap.gsap.to(mesh.rotation, {
    duration: Math.random() * 0.5,
    x: rotation.x,
    y: rotation.y,
    z: rotation.z,
  })

  mesh.rotation.copy(rotation)
  mesh.position.copy(position)
  mesh.castShadow = true

  scene.add(mesh)

  // Cannon.js body
  const shape = new CANNON.Box(new CANNON.Vec3(width * 0.5, height * 0.8, depth * 0.5))

  const body = new CANNON.Body({
    mass: 0.3,
    position: new CANNON.Vec3(0, 3, 0),
    shape: shape,
  })
  body.position.copy(position as unknown as CANNON.Vec3)
  body.quaternion.copy(mesh.quaternion as unknown as CANNON.Quaternion)
  world.addBody(body)
  // body.angularVelocity.set(0, 0, 0)
  // body.sleep()

  // Save in objects
  const item = { body, mesh }
  objectsToUpdate.push(item)
  return item
}

//  generate cubes along line geometry
async function generateCubesAlongLine(lineGeometry: BufferGeometry) {
  const points = curve.getSpacedPoints(curve.getLength() / 2)
  for (let i = 0; i < points.length; i++) {
    if (i !== 0) await new Promise((resolve) => setTimeout(resolve, 100))
    const domino = createDomino(
      new THREE.Vector3(points[i].x, points[i].y + 2, points[i].z),
      new THREE.Euler(
        0,
        points[i + 1]
          ? Math.atan2(points[i + 1].x - points[i].x, points[i + 1].z - points[i].z)
          : 0,
        0
      )
    )

    // domino.mesh
    const green = new THREE.Color(0x3fa652)
    const red = new THREE.Color(0xdd283c)

    const mixedColor = red.clone().lerp(green, i / points.length)

    domino.mesh.material.color = mixedColor
  }

  setTimeout(() => {
    // console.log('impulse')
    ;(objectsToUpdate[0].body as CANNON.Body).applyLocalForce(
      new CANNON.Vec3(0, 0, 40),
      new CANNON.Vec3(0, 2, 0)
    )
    runStarted = true
  }, 1000)
}

// mouse down handler
function onMouseDown(evt) {
  // on first click add an extra point
  if (hasFinish === false) {
    if (evt.button === 0) addPoint()
    if (evt.button === 2) {
      generateCubesAlongLine(line.geometry)
      hasFinish = true
      controls.enabled = true
    }
  }
}

// render
function render() {
  const elapsedTime = clock.getElapsedTime()
  const deltaTime = elapsedTime - oldElapsedTime
  oldElapsedTime = elapsedTime

  // Update physics
  world.step(1 / 60, deltaTime, 3)

  for (const object of objectsToUpdate) {
    object.mesh.position.copy(object.body.position)
    object.mesh.quaternion.copy(object.body.quaternion)
  }

  if (runStarted) {
    // find object with highest velocity
    let highestVelocity = 0
    let highestVelocityObject = null
    for (const object of objectsToUpdate) {
      const velocity = object.body.velocity.length()
      if (velocity > highestVelocity && velocity > 0.5) {
        highestVelocity = velocity
        highestVelocityObject = object
      }
    }

    if (highestVelocityObject) {
      cameraTarget.position.lerp(highestVelocityObject.mesh.position, 0.1)
    }

    camera.lookAt(cameraTarget.position)
  } else {
    const centroid = new THREE.Vector3()
    const num = objectsToUpdate.length
    for (let i = 0; i < num; i++) {
      centroid.add(objectsToUpdate[i].mesh.position)
    }

    centroid.divideScalar(num)
    if (!isNaN(centroid.y)) {
      cameraTarget.position.lerp(centroid, 0.1)
    }

    camera.lookAt(cameraTarget.position)
  }
  let activeCamera = camera
  if (!hasFinish) {
    activeCamera = firstCamera
  }
  renderer.render(scene, activeCamera)
}

// animate
function animate() {
  requestAnimationFrame(animate)
  render()
}

const gui = new dat.GUI()
const obj = {
  add: async function () {
    // console.log("clicked")

    for (let i = 0; i < 550; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      createDomino(
        new THREE.Vector3(0, 50, 0),
        new THREE.Euler(Math.random() * 360, Math.random() * 360, Math.random() * 360)
      )
    }
  },

  createForce: function () {
    // world.
  },
}

gui.add(obj, 'add')
