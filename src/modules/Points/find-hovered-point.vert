#ifdef GL_ES
precision highp float;
#endif

attribute float size;

uniform sampler2D positionsTexture;
uniform float pointsTextureSize;
uniform float sizeScale;
uniform float spaceSize;
uniform vec2 screenSize;
uniform float ratio;
uniform mat3 transformationMatrix;
uniform vec2 mousePosition;
uniform bool scalePointsOnZoom;
uniform float maxPointSize;

attribute vec2 pointIndices;

varying vec4 rgba;

float calculatePointSize(float size) {
  float pSize;
  if (scalePointsOnZoom) { 
    pSize = size * ratio * transformationMatrix[0][0];
  } else {
    pSize = size * ratio * min(5.0, max(1.0, transformationMatrix[0][0] * 0.01));
  }
  return min(pSize, maxPointSize * ratio);
}

float euclideanDistance (float x1, float x2, float y1, float y2) {
  return sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

void main() {
  vec4 pointPosition = texture2D(positionsTexture, (pointIndices + 0.5) / pointsTextureSize);

  // Transform point position to normalized device coordinates
  vec2 normalizedPoint = 2.0 * pointPosition.rg / spaceSize - 1.0;
  normalizedPoint *= spaceSize / screenSize;
  vec3 finalPosition = transformationMatrix * vec3(normalizedPoint, 1);

  float pointRadius = 0.5 * calculatePointSize(size * sizeScale);

  vec2 pointScreenPosition = (finalPosition.xy + 1.0) * screenSize / 2.0;
  rgba = vec4(0.0);
  gl_Position = vec4(0.5, 0.5, 0.0, 1.0);
  // Check if the mouse is within the point radius
  if (euclideanDistance(pointScreenPosition.x, mousePosition.x, pointScreenPosition.y, mousePosition.y) < pointRadius / ratio) {
    float index = pointIndices.g * pointsTextureSize + pointIndices.r;
    rgba = vec4(index, size, pointPosition.xy);
    gl_Position = vec4(-0.5, -0.5, 0.0, 1.0);
  }

  gl_PointSize = 1.0;
}