#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D positionsTexture;
uniform float repulsion;
uniform vec2 mousePos;

varying vec2 textureCoords;

void main() {  
  vec4 pointPosition = texture2D(positionsTexture, textureCoords);
  vec4 velocity = vec4(0.0);
  vec2 mouse = mousePos;
  // Move particles away from the mouse position using a repulsive force
  vec2 distVector = mouse - pointPosition.rg;
  float dist = sqrt(dot(distVector, distVector));
  dist = max(dist, 10.0);
  float angle = atan(distVector.y, distVector.x);
  float addV = 100.0 * repulsion / (dist * dist);
  velocity.rg -= addV * vec2(cos(angle), sin(angle));

  gl_FragColor = velocity;
}