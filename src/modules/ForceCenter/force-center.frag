#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D position;
uniform sampler2D centermass;
uniform float center;
uniform float alpha;

varying vec2 index;


void main() {
  vec4 pointPosition = texture2D(position, index);
  vec4 velocity = vec4(0.0);
  vec4 centermassValues = texture2D(centermass, vec2(0.0));
  vec2 centermassPosition = centermassValues.xy / centermassValues.b;
  vec2 distVector = centermassPosition - pointPosition.xy;
  float dist = sqrt(dot(distVector, distVector));
  if (dist > 0.0) {
    float angle = atan(distVector.y, distVector.x);
    float addV = alpha * center * dist * 0.01;
    velocity.rg += addV * vec2(cos(angle), sin(angle));
  }

  gl_FragColor = velocity;
}