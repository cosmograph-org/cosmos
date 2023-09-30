#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D position;
uniform float pointsTextureSize;
uniform float spaceSize;
uniform vec2 screenSize;
uniform mat3 transform;

attribute vec2 indexes;

varying vec4 rgba;

void main() {
  vec4 pointPosition = texture2D(position, (indexes + 0.5) / pointsTextureSize);
  vec2 p = 2.0 * pointPosition.rg / spaceSize - 1.0;
  p *= spaceSize / screenSize;
  vec3 final = transform * vec3(p, 1);

  vec2 pointScreenPosition = (final.xy + 1.0) * screenSize / 2.0;
  float index = indexes.g * pointsTextureSize + indexes.r;
  rgba = vec4(index, 1.0, pointPosition.xy);
  float i = (pointScreenPosition.x + 0.5) / screenSize.x;
  float j = (pointScreenPosition.y + 0.5) / screenSize.y;
  gl_Position = vec4(2.0 * vec2(i, j) - 1.0, 0.0, 1.0);

  gl_PointSize = 1.0;
}