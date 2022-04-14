precision highp float;

uniform bool useArrow;

varying vec4 rgbaColor;
varying vec2 pos;
varying float arrowLength;
varying float linkWidthArrowWidthRatio;
varying float smoothWidthRatio;
varying float targetPointSize;

float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

void main() {
  float opacity = 1.0;
  vec3 color = rgbaColor.rgb;
  float smoothDelta = smoothWidthRatio / 2.0;
  if (useArrow) {
    float end_arrow = 0.5 + arrowLength / 2.0;
    float start_arrow = end_arrow - arrowLength;
    float arrowWidthDelta = linkWidthArrowWidthRatio / 2.0;
    float linkOpacity = rgbaColor.a * smoothstep(0.5 - arrowWidthDelta, 0.5 - arrowWidthDelta - smoothDelta, abs(pos.y));
    float arrowOpacity = 1.0;
    if (pos.x > start_arrow && pos.x < start_arrow + arrowLength) {
      float xmapped = map(pos.x, start_arrow, end_arrow, 0.0, 1.0);
      arrowOpacity = rgbaColor.a * smoothstep(xmapped - smoothDelta, xmapped, map(abs(pos.y), 0.5, 0.0, 0.0, 1.0));
      if (linkOpacity != arrowOpacity) {
        linkOpacity += arrowOpacity;
      }
    }
    opacity = linkOpacity;
  } else opacity = rgbaColor.a * smoothstep(0.5, 0.5 - smoothDelta, abs(pos.y));
  
  gl_FragColor = vec4(color, opacity);
}