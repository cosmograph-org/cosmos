#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D positionsTexture;
uniform float pointsTextureSize;

attribute vec2 pointIndices;

varying vec4 rgba;

void main() {
  vec4 pointPosition = texture2D(positionsTexture, pointIndices / pointsTextureSize);
  rgba = vec4(pointPosition.xy, 1.0, 0.0);

  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
  gl_PointSize = 1.0;
}
