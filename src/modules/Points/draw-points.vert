#ifdef GL_ES
precision highp float;
#endif

attribute vec2 pointIndices;
attribute float size;
attribute vec4 color;

uniform sampler2D positionsTexture;
uniform sampler2D pointGreyoutStatus;
uniform float ratio;
uniform mat3 transformationMatrix;
uniform float pointsTextureSize;
uniform float sizeScale;
uniform float spaceSize;
uniform vec2 screenSize;
uniform float greyoutOpacity;
uniform bool scalePointsOnZoom;
uniform float maxPointSize;

varying vec2 textureCoords;
varying vec3 rgbColor;
varying float alpha;

float calculatePointSize(float size) {
  float pSize;
  if (scalePointsOnZoom) { 
    pSize = size * ratio * transformationMatrix[0][0];
  } else {
    pSize = size * ratio * min(5.0, max(1.0, transformationMatrix[0][0] * 0.01));
  }

  return min(pSize, maxPointSize * ratio);
}

void main() {  
  textureCoords = pointIndices;
  // Position
  vec4 pointPosition = texture2D(positionsTexture, (textureCoords + 0.5) / pointsTextureSize);
  vec2 point = pointPosition.rg;

  // Transform point position to normalized device coordinates
  vec2 normalizedPosition = 2.0 * point / spaceSize - 1.0;
  normalizedPosition *= spaceSize / screenSize;
  vec3 finalPosition = transformationMatrix * vec3(normalizedPosition, 1);
  gl_Position = vec4(finalPosition.rg, 0, 1);

  gl_PointSize = calculatePointSize(size * sizeScale);

  rgbColor = color.rgb;
  alpha = color.a;

  // Adjust alpha of selected points
  vec4 greyoutStatus = texture2D(pointGreyoutStatus, (textureCoords + 0.5) / pointsTextureSize);
  if (greyoutStatus.r > 0.0) {
    alpha *= greyoutOpacity;
  }
}
