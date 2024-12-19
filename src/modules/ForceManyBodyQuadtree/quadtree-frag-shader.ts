/* The fragment shader calculates the velocity of a point based on its position,
* the positions of other points in a spatial hierarchy, and random factors.
**/
export function forceFrag (startLevel: number, maxLevels: number): string {
  startLevel = Math.min(startLevel, maxLevels)
  const delta = maxLevels - startLevel
  const calculateVelocityAdjustment = `
    float dist = sqrt(l);
    if (dist > 0.0) {
      float c = alpha * repulsion * centermass.b;
      addVelocity += calculateAdditionalVelocity(vec2(x, y), l, c);
      addVelocity += addVelocity * random.rg;
    }
  `
  function quad (level: number): string {
    if (level >= maxLevels) {
      return calculateVelocityAdjustment
    } else {
      const groupSize = Math.pow(2, level + 1)

      const iEnding = new Array(level + 1 - delta).fill(0).map((_, l) => `pow(2.0, ${level - (l + delta)}.0) * i${l + delta}`).join('+')
      const jEnding = new Array(level + 1 - delta).fill(0).map((_, l) => `pow(2.0, ${level - (l + delta)}.0) * j${l + delta}`).join('+')

      return `
      for (float ij${level} = 0.0; ij${level} < 4.0; ij${level} += 1.0) {
        float i${level} = 0.0;
        float j${level} = 0.0;
        if (ij${level} == 1.0 || ij${level} == 3.0) i${level} = 1.0;
        if (ij${level} == 2.0 || ij${level} == 3.0) j${level} = 1.0;
        float i = pow(2.0, ${startLevel}.0) * n / width${level + 1} + ${iEnding};
        float j = pow(2.0, ${startLevel}.0) * m / width${level + 1} + ${jEnding};
        float groupPosX = (i + 0.5) / ${groupSize}.0;
        float groupPosY = (j + 0.5) / ${groupSize}.0;
        
        vec4 centermass = texture2D(level[${level}], vec2(groupPosX, groupPosY));
        if (centermass.r > 0.0 && centermass.g > 0.0 && centermass.b > 0.0) {
          float x = centermass.r / centermass.b - pointPosition.r;
          float y = centermass.g / centermass.b - pointPosition.g;
          float l = x * x + y * y;
          if ((width${level + 1} * width${level + 1}) / theta < l) {
            ${calculateVelocityAdjustment}
          } else {
            ${quad(level + 1)}
          }
        }
      }
      `
    }
  }
  return `
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D positionsTexture;
uniform sampler2D randomValues;
uniform float spaceSize;
uniform float repulsion;
uniform float theta;
uniform float alpha;
uniform sampler2D level[${maxLevels}];
varying vec2 textureCoords;

vec2 calculateAdditionalVelocity(vec2 xy, float l, float c) {
  float distanceMin2 = 1.0;
  if (l < distanceMin2) l = sqrt(distanceMin2 * l);
  float add = c / l;
  return add * xy;
}

void main() {
  vec4 pointPosition = texture2D(positionsTexture, textureCoords);
  vec4 random = texture2D(randomValues, textureCoords);

  float width0 = spaceSize;

  vec2 velocity = vec2(0.0);
  vec2 addVelocity = vec2(0.0);

  ${new Array(maxLevels).fill(0).map((_, i) => `float width${i + 1} = width${i} / 2.0;`).join('\n')}

  for (float n = 0.0; n < pow(2.0, ${delta}.0); n += 1.0) {
    for (float m = 0.0; m < pow(2.0, ${delta}.0); m += 1.0) {
      ${quad(delta)}
    }
  }

  velocity -= addVelocity;

  gl_FragColor = vec4(velocity, 0.0, 0.0);
}
`
}
