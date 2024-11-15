#ifdef GL_ES
precision highp float;
#endif

varying vec4 rgba;

void main() {
  gl_FragColor = rgba;
}