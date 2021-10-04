import * as THREE from 'three'
import * as dat from 'dat.gui'

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 90, window.innerWidth / window.innerHeight, 0.1, 10000 );
const gui = new dat.GUI();

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setClearColor( 0xffffff );
document.body.appendChild( renderer.domElement );

// const geometry = new THREE.BoxGeometry();
// const material = new THREE.MeshLambertMaterial( { color: 0x00ff00 } );
// const cube = new THREE.Mesh( geometry, material );
// scene.add( cube );

camera.position.z = 5;

const animate = function () {
    requestAnimationFrame( animate );

    // cube.rotation.x += 0.01;
    // cube.rotation.y += 0.01;

    renderer.render( scene, camera );
};

animate();

// automatically resize the renderer
window.addEventListener( 'resize', function () {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize( width, height );
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
})

// add a light
const light = new THREE.PointLight(0xffffff, 1, 100);
light.position.set(0, 0, 10);
scene.add(light);

// create shader variant of threejs MeshToonMaterial


// apply shader to the plane
function vertexShader() {
    return `
      vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

      float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                 -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
          dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      varying vec3 vUv; 
      varying vec3 vNormal;
      uniform float time;

      void main() {
        vUv = position; 
        vNormal = normal;
  
        vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);

        float displacement = 16.0 * snoise( 0.02 * position.xy + time * 0.5 );
        vec3 newPosition = position + normal * displacement;
        gl_Position = projectionMatrix * (modelViewPosition + vec4(newPosition, 1.0) * .7);
      }
    `
  }

function fragmentShader() {
    return `

    varying vec3 Normal;
    uniform vec3 LightPosition = vec3(10.0, 10.0, 20.0);
void main() {
    vec4 color1 = gl_FrontMaterial.diffuse;
    vec4 color2;

    float intensity = dot(normalize(LightPosition),Normal);

    if (intensity > 0.95)      color2 = vec4(1.0, 1.0, 1.0, 1.0);
    else if (intensity > 0.75) color2 = vec4(0.8, 0.8, 0.8, 1.0);
    else if (intensity > 0.50) color2 = vec4(0.6, 0.6, 0.6, 1.0);
    else if (intensity > 0.25) color2 = vec4(0.4, 0.4, 0.4, 1.0);
    else                       color2 = vec4(0.2, 0.2, 0.2, 1.0);

    gl_FragColor = color1 * color2;
}
    `
}


// add a plane with wireframe 
const planeGeometry2 = new THREE.PlaneGeometry(100, 100, 100, 100);
let uniforms = {
    colorB: {type: 'vec3', value: new THREE.Color(0xACB6E5)},
    colorA: {type: 'vec3', value: new THREE.Color(0x74ebd5)},
    time: { type: 'f', value: 0.0 },
}
const planeMaterial2 = new THREE.ShaderMaterial({
    uniforms: uniforms,
    wireframe: true,
    fragmentShader: fragmentShader(),
    vertexShader: vertexShader(),
})
const plane2 = new THREE.Mesh(planeGeometry2, planeMaterial2);
plane2.rotation.x = -(Math.PI / 2)
plane2.position.y = -5;
// plane2.position.z = -20;
scene.add(plane2);

// const axesHelper = new THREE.AxesHelper( 5 );
// scene.add( axesHelper );

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    planeMaterial2.uniforms.time.value = clock.getElapsedTime();
    // plane2.position.z -= 0.5
    renderer.render(scene, camera)
});


// gui.add('')