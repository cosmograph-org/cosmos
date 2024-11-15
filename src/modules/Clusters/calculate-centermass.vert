#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D positionsTexture;
uniform sampler2D clusterTexture;
uniform float pointsTextureSize;
uniform float clustersTextureSize;

attribute vec2 pointIndices;

varying vec4 rgba;

void main() {
  vec4 pointPosition = texture2D(positionsTexture, pointIndices / pointsTextureSize);
  rgba = vec4(pointPosition.xy, 1.0, 0.0);

  vec4 pointClusterIndicies = texture2D(clusterTexture, pointIndices / pointsTextureSize);
  vec2 xy = 2.0 * (pointClusterIndicies.xy + 0.5) / clustersTextureSize - 1.0;
  
  gl_Position = vec4(xy, 0.0, 1.0);
  gl_PointSize = 1.0;
}
