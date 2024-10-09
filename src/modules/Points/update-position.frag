#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D positionsTexture;
uniform sampler2D velocity;
uniform float friction;
uniform float spaceSize;

varying vec2 textureCoords;

void main() {
  vec4 pointPosition = texture2D(positionsTexture, textureCoords);
  vec4 pointVelocity = texture2D(velocity, textureCoords);

  // Friction
  pointVelocity.rg *= friction;

  pointPosition.rg += pointVelocity.rg;

  pointPosition.r = clamp(pointPosition.r, 0.0, spaceSize);
  pointPosition.g = clamp(pointPosition.g, 0.0, spaceSize);
  
  gl_FragColor = pointPosition;
}