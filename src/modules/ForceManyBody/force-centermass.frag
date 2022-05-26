#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D position;
uniform sampler2D levelFbo;
uniform sampler2D randomValues;

uniform float levelTextureSize;
uniform float repulsion;
uniform float alpha;

varying vec2 index;

vec2 calcAdd (vec2 ij, vec2 pp) {
  vec2 add = vec2(0.0);
  vec4 centermass = texture2D(levelFbo, ij);
  if (centermass.r > 0.0 && centermass.g > 0.0 && centermass.b > 0.0) {
    vec2 centermassPosition = vec2(centermass.rg / centermass.b);
    vec2 distVector = pp - centermassPosition;
    float l = dot(distVector, distVector);
    float dist = sqrt(l);
    if (l > 0.0) {
      float angle = atan(distVector.y, distVector.x);
      float c = alpha * repulsion * centermass.b;

      float distanceMin2 = 1.0;
      if (l < distanceMin2) l = sqrt(distanceMin2 * l);
      float addV = c / sqrt(l);
      add = addV * vec2(cos(angle), sin(angle));
    }
  }
  return add;
}

void main() {
  vec4 pointPosition = texture2D(position, index);
  vec4 random = texture2D(randomValues, index);

  vec4 velocity = vec4(0.0);
  velocity.xy += calcAdd(pointPosition.xy / levelTextureSize, pointPosition.xy);
  velocity.xy += velocity.xy * random.rg;

  gl_FragColor = velocity;
}