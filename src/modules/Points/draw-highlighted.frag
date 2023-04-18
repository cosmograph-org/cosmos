precision mediump float;

uniform vec4 color;
uniform float width;

varying vec2 pos;
varying float particleOpacity;

const float smoothing = 1.05;

void main () {
  vec2 cxy = pos;
  float r = dot(cxy, cxy);
  float opacity = smoothstep(r, r * smoothing, 1.0);
  float stroke = smoothstep(width, width * smoothing, r);
  gl_FragColor = vec4(color.rgb, opacity * stroke * color.a * particleOpacity);
}