#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D positionsTexture;
uniform vec2 mousePos;
uniform vec2 dragPointTextureIndex;

varying vec2 textureCoords;

void main() {
  vec4 pointPosition = texture2D(positionsTexture, textureCoords);

  // Check if a point is being dragged
  if (dragPointTextureIndex.r >= 0.0 && dragPointTextureIndex.g >= 0.0) {
    vec4 draggedPointPosition = texture2D(positionsTexture, dragPointTextureIndex);

    // If the current point is the one being dragged, update its position to the mouse position
    if (pointPosition.r == draggedPointPosition.r && pointPosition.g == draggedPointPosition.g) {
      pointPosition.rg = mousePos.rg;
    }
  }

  gl_FragColor = pointPosition;
}