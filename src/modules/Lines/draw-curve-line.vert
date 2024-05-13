precision highp float;
attribute vec2 position, pointA, pointB;
attribute vec4 color;
attribute float width;
attribute float arrow;
uniform sampler2D positions;
uniform sampler2D particleGreyoutStatus;
uniform mat3 transform;
uniform float pointsTextureSize;
uniform float widthScale;
uniform float nodeSizeScale;
uniform float arrowSizeScale;
uniform float spaceSize;
uniform vec2 screenSize;
uniform float ratio;
uniform vec2 linkVisibilityDistanceRange;
uniform float linkVisibilityMinTransparency;
uniform float greyoutOpacity;
uniform bool scaleNodesOnZoom;
uniform float curvedWeight;
uniform float curvedLinkControlPointDistance;
uniform float curvedLinkSegments;

varying vec4 rgbaColor;
varying vec2 pos;
varying float arrowLength;
varying float linkWidthArrowWidthRatio;
varying float smoothWidthRatio;
varying float useArrow;

float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

vec2 conicParametricCurve(vec2 A, vec2 B, vec2 ControlPoint, float t, float w) {
  vec2 divident = (1.0 - t) * (1.0 - t) * A + 2.0 * (1.0 - t) * t * w * ControlPoint + t * t * B;
  float divisor = (1.0 - t) * (1.0 - t) + 2.0 * (1.0 - t) * t * w + t * t;
  return divident / divisor;
}

void main() {
  pos = position;

  vec2 pointTexturePosA = (pointA + 0.5) / pointsTextureSize;
  vec2 pointTexturePosB = (pointB + 0.5) / pointsTextureSize;
  // Greyed out status of points
  vec4 greyoutStatusA = texture2D(particleGreyoutStatus, pointTexturePosA);
  vec4 greyoutStatusB = texture2D(particleGreyoutStatus, pointTexturePosB);
  // Position
  vec4 pointPositionA = texture2D(positions, pointTexturePosA);
  vec4 pointPositionB = texture2D(positions, pointTexturePosB);
  vec2 a = pointPositionA.xy;
  vec2 b = pointPositionB.xy;
  vec2 xBasis = b - a;
  vec2 yBasis = normalize(vec2(-xBasis.y, xBasis.x));

  // Calculate link distance
  float linkDist = length(xBasis);
  float h = curvedLinkControlPointDistance;
  vec2 controlPoint = (a + b) / 2.0 + yBasis * linkDist * h;

  float linkDistPx = linkDist * transform[0][0];
  
  float linkWidth = width * widthScale;
  float k = 2.0;
  float arrowWidth = max(5.0, linkWidth * k);
  arrowWidth *= arrowSizeScale;

  float arrowWidthPx = arrowWidth / transform[0][0];
  arrowLength = min(0.3, (0.866 * arrowWidthPx * 2.0) / linkDist);

  float smoothWidth = 2.0;
  float arrowExtraWidth = arrowWidth - linkWidth;
  linkWidth += smoothWidth / 2.0;
  useArrow = arrow;
  if (useArrow > 0.5) {
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

  float t = position.x;
  float w = curvedWeight;
  float tPrev = t - 1.0 / curvedLinkSegments;
  float tNext = t + 1.0 / curvedLinkSegments;
  vec2 pointCurr = conicParametricCurve(a, b, controlPoint, t, w);
  vec2 pointPrev = conicParametricCurve(a, b, controlPoint, max(0.0, tPrev), w);
  vec2 pointNext = conicParametricCurve(a, b, controlPoint, min(tNext, 1.0), w);
  vec2 xBasisCurved = pointNext - pointPrev;
  vec2 yBasisCurved = normalize(vec2(-xBasisCurved.y, xBasisCurved.x));
  pointCurr += yBasisCurved * linkWidthPx * position.y;
  vec2 p = 2.0 * pointCurr / spaceSize - 1.0;
  p *= spaceSize / screenSize;
  vec3 final =  transform * vec3(p, 1);
  gl_Position = vec4(final.rg, 0, 1);
}