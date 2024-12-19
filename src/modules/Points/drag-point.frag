#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D positionsTexture;
uniform vec2 mousePos;
uniform float index;

varying vec2 textureCoords;

void main() {
  vec4 pointPosition = texture2D(positionsTexture, textureCoords);

  // Check if a point is being dragged
  if (index >= 0.0 && index == pointPosition.b) {
    pointPosition.rg = mousePos.rg;
  }

  gl_FragColor = pointPosition;
}