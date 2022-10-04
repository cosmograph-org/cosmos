precision highp float;
attribute vec2 position, pointA, pointB;
attribute vec4 color;
attribute float width;
uniform sampler2D positions;
uniform sampler2D particleSize;
uniform sampler2D particleGreyoutStatus;
uniform mat3 transform;
uniform float pointsTextureSize;
uniform float widthScale;
uniform float nodeSizeScale;
uniform bool useArrow;
uniform float arrowSizeScale;
uniform float spaceSize;
uniform vec2 screenSize;
uniform float ratio;
uniform vec2 linkVisibilityDistanceRange;
uniform float linkVisibilityMinTransparency;
uniform float greyoutOpacity;
uniform bool scaleNodesOnZoom;

varying vec4 rgbaColor;
varying vec2 pos;
varying float arrowLength;
varying float linkWidthArrowWidthRatio;
varying float smoothWidthRatio;
varying float targetPointSize;

float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

float pointSize(float size) {
  float pSize;
  if (scaleNodesOnZoom) { 
    pSize = size * ratio * transform[0][0];
  } else {
    pSize = size * ratio * min(5.0, max(1.0, transform[0][0] * 0.01));
  }
  return pSize;
}

void main() {
  pos = position;

  vec2 pointTexturePosA = (pointA + 0.5) / pointsTextureSize;
  vec2 pointTexturePosB = (pointB + 0.5) / pointsTextureSize;
  // Greyed out status of points
  vec4 greyoutStatusA = texture2D(particleGreyoutStatus, pointTexturePosA);
  vec4 greyoutStatusB = texture2D(particleGreyoutStatus, pointTexturePosB);
  // Target particle size
  targetPointSize = pointSize(texture2D(particleSize, pointTexturePosB).r * nodeSizeScale);
  // Position
  vec4 pointPositionA = texture2D(positions, pointTexturePosA);
  vec4 pointPositionB = texture2D(positions, pointTexturePosB);
  vec2 a = pointPositionA.xy;
  vec2 b = pointPositionB.xy;
  vec2 xBasis = b - a;
  vec2 yBasis = normalize(vec2(-xBasis.y, xBasis.x));

  // Calculate link distance
  vec2 distVector = a - b;
  float linkDist = sqrt(dot(distVector, distVector));
  float linkDistPx = linkDist * transform[0][0];

  targetPointSize = (targetPointSize / (2.0 * ratio)) / linkDistPx;
  
  float linkWidth = width * widthScale;
  float k = 2.0;
  float arrowWidth = max(5.0, linkWidth * k);
  arrowWidth *= arrowSizeScale;

  float arrowWidthPx = arrowWidth / transform[0][0];
  arrowLength = min(0.3, (0.866 * arrowWidthPx * 2.0) / linkDist);

  float smoothWidth = 2.0;
  float arrowExtraWidth = arrowWidth - linkWidth;
  linkWidth += smoothWidth / 2.0;
  if (useArrow) {
    linkWidth += arrowExtraWidth;
  }
  smoothWidthRatio = smoothWidth / linkWidth;
  linkWidthArrowWidthRatio = arrowExtraWidth / linkWidth;

  float linkWidthPx = linkWidth / transform[0][0];

  // Color
  vec3 rgbColor = color.rgb;
  float opacity = color.a * max(linkVisibilityMinTransparency, map(linkDistPx, linkVisibilityDistanceRange.g, linkVisibilityDistanceRange.r, 0.0, 1.0));

  if (greyoutStatusA.r > 0.0 || greyoutStatusB.r > 0.0) {
    opacity *= greyoutOpacity;
  }

  rgbaColor = vec4(rgbColor, opacity);

  vec2 point = a + xBasis * position.x + yBasis * linkWidthPx * position.y;
  vec2 p = 2.0 * point / spaceSize - 1.0;
  p *= spaceSize / screenSize;
  vec3 final =  transform * vec3(p, 1);
  gl_Position = vec4(final.rg, 0, 1);
}