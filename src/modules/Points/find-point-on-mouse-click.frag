#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D position;
uniform sampler2D particleSize;
uniform float sizeScale;
uniform float spaceSize;
uniform vec2 screenSize;
uniform float ratio;
uniform mat3 transform;
uniform vec2 mousePosition;
uniform bool scaleNodesOnZoom;
uniform float maxPointSize;

varying vec2 index;

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
  vec4 pointPosition = texture2D(position, index);
  vec2 p = 2.0 * pointPosition.rg / spaceSize - 1.0;
  p *= spaceSize / screenSize;
  vec3 final = transform * vec3(p, 1);

  vec4 pSize = texture2D(particleSize, index);
  float size = pSize.r * sizeScale;

  vec2 pointScreenPosition = (final.xy + 1.0) * screenSize / 2.0;

  gl_FragColor = vec4(0.0, 0.0, pointPosition.rg);
  if (euclideanDistance(pointScreenPosition.x, mousePosition.x, pointScreenPosition.y, mousePosition.y) < 0.5 * pointSize(size)) {
    gl_FragColor.r = 1.0;
  }
}

