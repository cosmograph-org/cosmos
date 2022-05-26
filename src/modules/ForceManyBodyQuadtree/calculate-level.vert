#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D position;
uniform float pointsTextureSize;
uniform float levelTextureSize;
uniform float cellSize;

attribute vec2 indexes;

varying vec4 rgba;

void main() {
  vec4 pointPosition = texture2D(position, indexes / pointsTextureSize);
  rgba = vec4(pointPosition.rg, 1.0, 0.0);

  float n = floor(pointPosition.x / cellSize);
  float m = floor(pointPosition.y / cellSize);
  
  vec2 levelPosition = 2.0 * (vec2(n, m) + 0.5) / levelTextureSize - 1.0;

  gl_Position = vec4(levelPosition, 0.0, 1.0);
  gl_PointSize = 1.0;
}