#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D position;
uniform float gravity;
uniform float spaceSize;
uniform float alpha;

varying vec2 index;

void main() {
  vec4 pointPosition = texture2D(position, index);
  vec4 velocity = vec4(0.0);
  vec2 centerPosition = vec2(spaceSize / 2.0);
  vec2 distVector = centerPosition - pointPosition.rg;
  float dist = sqrt(dot(distVector, distVector));
  if (dist > 0.0) {
    float angle = atan(distVector.y, distVector.x);
    float addV = alpha * gravity * dist * 0.1;
    velocity.rg += addV * vec2(cos(angle), sin(angle));
  }

  gl_FragColor = velocity;
}