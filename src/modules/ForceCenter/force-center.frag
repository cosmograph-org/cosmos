#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D positionsTexture;
uniform sampler2D centermassTexture;
uniform float centerForce;
uniform float alpha;

varying vec2 textureCoords;


void main() {
  vec4 pointPosition = texture2D(positionsTexture, textureCoords);
  vec4 velocity = vec4(0.0);
  vec4 centermassValues = texture2D(centermassTexture, vec2(0.0));
  vec2 centermassPosition = centermassValues.xy / centermassValues.b;
  vec2 distVector = centermassPosition - pointPosition.xy;
  float dist = sqrt(dot(distVector, distVector));
  if (dist > 0.0) {
    float angle = atan(distVector.y, distVector.x);
    float addV = alpha * centerForce * dist * 0.01;
    velocity.rg += addV * vec2(cos(angle), sin(angle));
  }

  gl_FragColor = velocity;
}