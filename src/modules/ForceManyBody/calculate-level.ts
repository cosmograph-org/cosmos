export function calculateLevelVert (levelMatrixSize: number, levelSize: number): string {
  return `
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D position;
uniform float pointsTextureSize;

attribute vec2 indexes;

varying vec4 rgba;

void main() {
  vec4 pointPosition = texture2D(position, indexes / pointsTextureSize);
  rgba = vec4(pointPosition.rg, 1.0, 0.0);

  float n = floor(pointPosition.x / ${levelSize}.0);
  float m = floor(pointPosition.y / ${levelSize}.0);
  
  vec2 levelPosition = 2.0 * (vec2(n, m) + 0.5) / ${levelMatrixSize}.0 - 1.0;

  gl_Position = vec4(levelPosition, 0.0, 1.0);
  gl_PointSize = 1.0;
}
`
}
