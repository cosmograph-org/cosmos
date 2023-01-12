precision mediump float;

attribute vec2 quad;

uniform sampler2D positions;
uniform sampler2D particleSize;
uniform mat3 transform;
uniform float pointsTextureSize;
uniform float sizeScale;
uniform float spaceSize;
uniform vec2 screenSize;
uniform bool scaleNodesOnZoom;
uniform vec2 hoveredPointIndices;
uniform float maxPointSize;
uniform vec4 color;

varying float isHighlighted;
varying vec2 pos;

float pointSize(float size) {
  float pSize;
  if (scaleNodesOnZoom) { 
    pSize = size * transform[0][0];
  } else {
    pSize = size * min(5.0, max(1.0, transform[0][0] * 0.01));
  }
  return min(pSize, maxPointSize);
}

const float relativeRingRadius = 1.3;

void main () {
  if (hoveredPointIndices.r < 0.0) isHighlighted = 0.0;
  else isHighlighted = 1.0;
  pos = quad;
  vec4 pointPosition = texture2D(positions, (hoveredPointIndices + 0.5) / pointsTextureSize);
  vec4 pSize = texture2D(particleSize, (hoveredPointIndices + 0.5) / pointsTextureSize);
  float size = (pointSize(pSize.r * sizeScale) * relativeRingRadius) / transform[0][0];
  float radius = size * 0.5;
  vec2 a = pointPosition.xy;
  vec2 b = pointPosition.xy + vec2(0.0, radius);
  vec2 xBasis = b - a;
  vec2 yBasis = normalize(vec2(-xBasis.y, xBasis.x));
  vec2 point = a + xBasis * quad.x + yBasis * radius * quad.y;
  vec2 p = 2.0 * point / spaceSize - 1.0;
  p *= spaceSize / screenSize;
  vec3 final =  transform * vec3(p, 1);
  
  gl_Position = vec4(final.rg, 0, 1);
}