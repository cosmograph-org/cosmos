precision mediump float;

uniform vec4 color;
uniform float width;

varying vec2 vertexPosition;
varying float pointOpacity;

const float smoothing = 1.05;

void main () {
  float r = dot(vertexPosition, vertexPosition);
  float opacity = smoothstep(r, r * smoothing, 1.0);
  float stroke = smoothstep(width, width * smoothing, r);
  gl_FragColor = vec4(color.rgb, opacity * stroke * color.a * pointOpacity);
}