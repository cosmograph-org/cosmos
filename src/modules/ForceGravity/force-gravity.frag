#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D positionsTexture;
uniform float gravity;
uniform float spaceSize;
uniform float alpha;

varying vec2 textureCoords;

void main() {
  vec4 pointPosition = texture2D(positionsTexture, textureCoords);

  vec4 velocity = vec4(0.0);

  vec2 centerPosition = vec2(spaceSize / 2.0);
  vec2 distVector = centerPosition - pointPosition.rg;
  float dist = sqrt(dot(distVector, distVector));
  if (dist > 0.0) {
    float angle = atan(distVector.y, distVector.x);
    float additionalVelocity = alpha * gravity * dist * 0.1;
    velocity.rg += additionalVelocity * vec2(cos(angle), sin(angle));
  }

  gl_FragColor = velocity;
}