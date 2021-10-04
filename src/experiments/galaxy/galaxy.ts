import dat from 'dat.gui'
import * as THREE from 'three'
import { Points } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera( 90, window.innerWidth / window.innerHeight, 0.1, 1000 )
const renderer = new THREE.WebGLRenderer({antialias:true})
renderer.setClearColor("#000000")
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)
var controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true

camera.position.z = 5
camera.position.y = 2

// add light
const light = new THREE.PointLight(0xffffff, 1, 100)
light.position.set(0, 0, 10)
scene.add(light)

const parameters = {
    starsCount: 16000,
    count: 9000,
    branches: 7,
    radius: 5,
    spin: 1.15,
    randomness: 0.29,
    randomnessPower: 4.8,
    insideColor: '#ff6030',
    outsideColor: '#1b3984',
    bloomThreshold: 0,
    bloomStrength: 2.8,
    bloomRadius: 0.6,
    exposure: 0.5,

    starColorA: '#ffffff',
    starColorB: '#c300ff',
    starColorC: '#efff00',
    starColorD: '#ff0e00',
}

let points: THREE.Points
let starPoints: THREE.Points
let geometry: THREE.BufferGeometry
let starGeometry: THREE.BufferGeometry
let material: THREE.PointsMaterial
let starMaterial: THREE.PointsMaterial

const generateGalaxy = () => {

    if (points != null) {
        geometry.dispose()
        material.dispose()
        starGeometry.dispose()
        starMaterial.dispose()
        scene.remove(points)
        scene.remove(starPoints)
    }

    geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(parameters.count * 3)
    const colors = new Float32Array(parameters.count * 3)

    const colorInside = new THREE.Color(parameters.insideColor)
    const colorOutside = new THREE.Color(parameters.outsideColor)

    for (let i = 0; i < parameters.count; i++) {
        const i3 = i * 3;

        const radius = Math.random() * parameters.radius
        const spinAngle = radius * parameters.spin
        const branchAngle = (i % parameters.branches) / parameters.branches * Math.PI * 2

        const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : - 1) * parameters.randomness * radius
        const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : - 1) * parameters.randomness * radius
        const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : - 1) * parameters.randomness * radius


        positions[i3    ] = Math.cos(branchAngle + spinAngle) * radius + randomX
        positions[i3 + 1] = randomY
        positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ

        // Color
        const mixedColor = colorInside.clone()
        mixedColor.lerp(colorOutside, radius / parameters.radius)
        
        colors[i3    ] = mixedColor.r
        colors[i3 + 1] = mixedColor.g
        colors[i3 + 2] = mixedColor.b
    }
    

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    geometry.translate(0, 1, 0)
    geometry.rotateZ(0.1)


    material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.5,
        sizeAttenuation: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true
    })

    points = new THREE.Points(geometry, material)
    scene.add(points)


    // Generate stars
    starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(parameters.starsCount * 3)
    const starColors = new Float32Array(parameters.count * 3)

    for (let i = 0; i < parameters.starsCount; i++) {

        const i3 = i * 3;

        starPositions[i3] = (Math.random() * 2 - 1) * 50
        starPositions[i3 + 1] = (Math.random() * 2 - 1) * 15
        starPositions[i3 + 2] = (Math.random() * 2 - 1) * 50

        // Color

        // pick random item in array
        
        const colorsParameters = [
            parameters.starColorA,
            parameters.starColorB,
            parameters.starColorC,
            parameters.starColorD
        ];

        // pick random item in array
        const colorString = colorsParameters[Math.floor(Math.random() * colorsParameters.length)];

        const color = new THREE.Color(colorString)

        starColors[i3] = color.r
        starColors[i3+1] = color.g
        starColors[i3+2] = color.b
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3))


    starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.4,
        sizeAttenuation: false,
        depthWrite: false,
        vertexColors: true,
    })
    starPoints = new THREE.Points(starGeometry, starMaterial)
    starGeometry.translate(0, 1, 0)

    
    console.log(starPoints)
    scene.add(starPoints)
    
}

generateGalaxy()

const renderScene = new RenderPass( scene, camera );

const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
bloomPass.threshold = parameters.bloomThreshold;
bloomPass.strength = parameters.bloomStrength;
bloomPass.radius = parameters.bloomRadius;

let composer = new EffectComposer( renderer );
composer.addPass( renderScene );
composer.addPass( bloomPass );

// imports stats.js commonjs
// import Stats from 'stats-js'
// // add fps counter 
// var stats = new Stats();
// stats.showPanel( 1 ); // 0: fps, 1: ms, 2: mb, 3+: custom
// document.body.appendChild( stats.dom );

var gui = new dat.GUI();

gui.remember(gui);

gui.add(parameters, 'count', 0, 100000).onChange(generateGalaxy)
gui.add(parameters, 'starsCount', 0, 100000).onChange(generateGalaxy)
gui.add(parameters, 'branches', 0, 30, 1).onChange(generateGalaxy)
gui.add(parameters, 'radius', 10, 50).onChange(generateGalaxy)
gui.add(parameters, 'spin', 0, 10, 0.005).onChange(generateGalaxy)
gui.add(parameters, 'randomness', 0, 1, 0.01).onChange(generateGalaxy)
gui.add(parameters, 'randomnessPower').min(1).max(10).step(0.001).onFinishChange(generateGalaxy)

gui.addColor(parameters, 'insideColor').onFinishChange(generateGalaxy)
gui.addColor(parameters, 'outsideColor').onFinishChange(generateGalaxy)

gui.addColor(parameters, 'starColorA').onFinishChange(generateGalaxy)
gui.addColor(parameters, 'starColorB').onFinishChange(generateGalaxy)
gui.addColor(parameters, 'starColorC').onFinishChange(generateGalaxy)
gui.addColor(parameters, 'starColorD').onFinishChange(generateGalaxy)


gui.add(parameters, 'exposure', 0.1, 2 ).onChange( function ( value ) {

    renderer.toneMappingExposure = Math.pow( value, 4.0 );

} );

gui.add(parameters, 'bloomThreshold', 0.0, 1.0 ).onChange( function ( value ) {

    bloomPass.threshold = Number( value );

} );

gui.add(parameters, 'bloomStrength', 0.0, 5.0 ).onChange( function ( value ) {

    bloomPass.strength = Number( value );

} );

gui.add(parameters, 'bloomRadius', 0.0, 1.0 ).step( 0.01 ).onChange( function ( value ) {

    bloomPass.radius = Number( value );

} );


renderer.render(scene, camera)

const render = () => {
    requestAnimationFrame(render)

    geometry.rotateY(0.005)
    starGeometry.rotateY(0.004)
    controls.update()
    composer.render()
}
render()

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})