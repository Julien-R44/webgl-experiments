#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

#define NUM_PARTICLES 80.
#define PARTICLE_SPEED 1.
#define PARTICLE_BRIGHTNESS 0.003

vec2 hash12(float t) {
    float x = fract(sin(t*674.2)*456.2);
    float y = fract(sin((t+x)*674.2)*456.2);

    return vec2(x,y);
}

void main(){
    vec2 uv = (gl_FragCoord.xy - .5 * u_resolution.xy) / u_resolution.y;

    vec3 color = vec3(0);
    for (float i = 0.; i < NUM_PARTICLES; i++) {
        float t = fract(u_time * PARTICLE_SPEED + i * 0.1);
        vec2 dir = hash12(i) -.5;
        
        vec2 org = dir - uv;
        float d = length(org - dir * t);
        float brightness = PARTICLE_BRIGHTNESS * t * i * 0.02;

        vec3 sparkColor = vec3((dir +.5) * sin(t*2.7) * fract(cos(i * 7.)), 1);
        color += sparkColor * brightness / d;
    }

    gl_FragColor = vec4(color, 1.0);
}