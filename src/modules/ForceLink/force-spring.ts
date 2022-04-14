export function forceFrag (maxLinks: number): string {
  return `
#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D position;
uniform float linkSpring;
uniform float linkDistance;
uniform vec2 linkDistRandomVariationRange;

uniform sampler2D linkFirstIndicesAndAmount;
uniform sampler2D linkIndices;
uniform sampler2D linkBiasAndStrength;
uniform sampler2D linkRandomDistanceFbo;

uniform float pointsTextureSize;
uniform float linksTextureSize;
uniform float alpha;

varying vec2 index;

const float MAX_LINKS = ${maxLinks}.0;

void main() {
  vec4 pointPosition = texture2D(position, index);
  vec4 velocity = vec4(0.0);

  vec4 linkFirstIJAndAmount = texture2D(linkFirstIndicesAndAmount, index);
  float iCount = linkFirstIJAndAmount.r;
  float jCount = linkFirstIJAndAmount.g;
  float linkAmount = linkFirstIJAndAmount.b;
  if (linkAmount > 0.0) {
    for (float i = 0.0; i < MAX_LINKS; i += 1.0) {
      if (i < linkAmount) {
        if (iCount >= linksTextureSize) {
          iCount = 0.0;
          jCount += 1.0;
        }
        vec2 linkTextureIndex = (vec2(iCount, jCount) + 0.5) / linksTextureSize;
        vec4 connectedPointIndex = texture2D(linkIndices, linkTextureIndex);
        vec4 biasAndStrength = texture2D(linkBiasAndStrength, linkTextureIndex);
        vec4 randomMinDistance = texture2D(linkRandomDistanceFbo, linkTextureIndex);
        float bias = biasAndStrength.r;
        float strength = biasAndStrength.g;
        float randomMinLinkDist = randomMinDistance.r * (linkDistRandomVariationRange.g - linkDistRandomVariationRange.r) + linkDistRandomVariationRange.r;
        randomMinLinkDist *= linkDistance;

        iCount += 1.0;

        vec4 connectedPointPosition = texture2D(position, (connectedPointIndex.rg + 0.5) / pointsTextureSize);
        float x = connectedPointPosition.x - (pointPosition.x + velocity.x);
        float y = connectedPointPosition.y - (pointPosition.y + velocity.y);
        float l = sqrt(x * x + y * y);
        l = max(l, randomMinLinkDist * 0.99);
        l = (l - randomMinLinkDist) / l;
        l *= linkSpring * alpha;
        l *= strength;
        l *= bias;
        x *= l;
        y *= l;
        velocity.x += x;
        velocity.y += y;
      }
    }
  }

  gl_FragColor = vec4(velocity.rg, 0.0, 0.0);
}
  `
}
