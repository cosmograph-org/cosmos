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
uniform vec2 selection[2];
uniform bool isClick;

varying vec2 index;

float pointSize(float size) {
  return size * ratio * min(5.0, max(1.0, transform[0][0] * 0.01));
}

void main() {
  vec4 pointPosition = texture2D(position, index);
  vec2 p = 2.0 * pointPosition.rg / spaceSize - 1.0;
  p *= spaceSize / screenSize;
  vec3 final = transform * vec3(p, 1);

  vec4 pSize = texture2D(particleSize, index);
  float size = pSize.r * sizeScale;

  float left = 2.0 * (selection[0].x - 0.5 * pointSize(size)) / screenSize.x - 1.0;
  float right = 2.0 * (selection[1].x + 0.5 * pointSize(size)) / screenSize.x - 1.0;
  float top =  2.0 * (selection[0].y - 0.5 * pointSize(size)) / screenSize.y - 1.0;
  float bottom =  2.0 * (selection[1].y + 0.5 * pointSize(size)) / screenSize.y - 1.0;


  if (final.x >= left && final.x <= right && final.y >= top && final.y <= bottom) {
    gl_FragColor = vec4(1.0, isClick ? 1.0 : 0.0, 1.0, 1.0);
  } else {
    gl_FragColor = vec4(0.0);
  }
}

