#ifdef GL_ES
precision highp float;
#endif

attribute vec2 indexes;

uniform sampler2D positions;
uniform sampler2D particleColor;
uniform sampler2D particleSize;
uniform float ratio;
uniform mat3 transform;
uniform float pointsTextureSize;
uniform float sizeScale;
uniform float spaceSize;
uniform vec2 screenSize;

varying vec2 index;
varying vec3 rgbColor;
varying float alpha;

float pointSize(float size) {
  return size * ratio * min(5.0, max(1.0, transform[0][0] * 0.01));
}

void main() {  
  index = indexes;
  // Position
  vec4 pointPosition = texture2D(positions, (index + 0.5) / pointsTextureSize);
  vec2 point = pointPosition.rg;
  vec2 p = 2.0 * point / spaceSize - 1.0;
  p *= spaceSize / screenSize;
  vec3 final = transform * vec3(p, 1);
  gl_Position = vec4(final.rg, 0, 1);

  // Size
  vec4 pSize = texture2D(particleSize, (index + 0.5) / pointsTextureSize);
  float size = pSize.r * sizeScale;

  // Color
  vec4 pColor = texture2D(particleColor, (index + 0.5) / pointsTextureSize);
  rgbColor = pColor.rgb;
  gl_PointSize = pointSize(size);
  alpha = pColor.a;
}
