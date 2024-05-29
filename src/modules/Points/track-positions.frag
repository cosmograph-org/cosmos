#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D positionsTexture;
uniform sampler2D trackedIndices;
uniform float pointsTextureSize;

varying vec2 textureCoords;

void main() {
  vec4 trackedPointIndicies = texture2D(trackedIndices, textureCoords);
  if (trackedPointIndicies.r < 0.0) discard;
  vec4 pointPosition = texture2D(positionsTexture, (trackedPointIndicies.rg + 0.5) / pointsTextureSize);

  gl_FragColor = vec4(pointPosition.rg, 1.0, 1.0);
}

