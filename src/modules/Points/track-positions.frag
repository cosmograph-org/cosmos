#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D position;
uniform sampler2D trackedIndices;
uniform float pointsTextureSize;

varying vec2 index;

void main() {
  vec4 trackedPointIndicies = texture2D(trackedIndices, index);
  if (trackedPointIndicies.r < 0.0) discard;
  vec4 pointPosition = texture2D(position, (trackedPointIndicies.rg + 0.5) / pointsTextureSize);

  gl_FragColor = vec4(pointPosition.rg, 1.0, 1.0);
}

