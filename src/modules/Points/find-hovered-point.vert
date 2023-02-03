#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D position;
uniform float pointsTextureSize;
uniform sampler2D particleSize;
uniform float sizeScale;
uniform float spaceSize;
uniform vec2 screenSize;
uniform float ratio;
uniform mat3 transform;
uniform vec2 mousePosition;
uniform bool scaleNodesOnZoom;
uniform float maxPointSize;

attribute vec2 indexes;

varying vec4 rgba;

float pointSize(float size) {
  float pSize;
  if (scaleNodesOnZoom) { 
    pSize = size * ratio * transform[0][0];
  } else {
    pSize = size * ratio * min(5.0, max(1.0, transform[0][0] * 0.01));
  }
  return min(pSize, maxPointSize);
}

float euclideanDistance (float x1, float x2, float y1, float y2) {
  return sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

void main() {
  vec4 pointPosition = texture2D(position, (indexes + 0.5) / pointsTextureSize);
  vec2 p = 2.0 * pointPosition.rg / spaceSize - 1.0;
  p *= spaceSize / screenSize;
  vec3 final = transform * vec3(p, 1);

  vec4 pSize = texture2D(particleSize, indexes / pointsTextureSize);
  float size = pSize.r * sizeScale;
  float pointRadius = 0.5 * pointSize(size);

  vec2 pointScreenPosition = (final.xy + 1.0) * screenSize / 2.0;
  rgba = vec4(0.0);
  gl_Position = vec4(0.5, 0.5, 0.0, 1.0);
  if (euclideanDistance(pointScreenPosition.x, mousePosition.x, pointScreenPosition.y, mousePosition.y) < pointRadius) {
    float index = indexes.g * pointsTextureSize + indexes.r;
    rgba = vec4(index, pSize.r, pointPosition.xy);
    gl_Position = vec4(-0.5, -0.5, 0.0, 1.0);
  }

  gl_PointSize = 1.0;
}