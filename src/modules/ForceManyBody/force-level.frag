#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D position;
uniform sampler2D levelFbo;

uniform float level;
uniform float levels;
uniform float levelTextureSize;
uniform float repulsion;
uniform float alpha;
uniform float spaceSize;
uniform float theta;

varying vec2 index;

const float MAX_LEVELS_NUM = 14.0;

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
  float x = pointPosition.x;
  float y = pointPosition.y;

  float left = 0.0;
  float top = 0.0;
  float right = spaceSize;
  float bottom = spaceSize;

  float n_left = 0.0;
  float n_top = 0.0;
  float n_right = 0.0;
  float n_bottom = 0.0;

  float cellSize = 0.0;

  for (float i = 0.0; i < MAX_LEVELS_NUM; i += 1.0) {
    if (i <= level) {
      left += cellSize * n_left;
      top += cellSize * n_top;
      right -= cellSize * n_right;
      bottom -= cellSize * n_bottom;

      cellSize = pow(2.0 , levels - i - 1.0);

      float dist_left = x - left;
      n_left = max(0.0, floor(dist_left / cellSize - theta));

      float dist_top = y - top;
      n_top = max(0.0, floor(dist_top / cellSize - theta));
      
      float dist_right = right - x;
      n_right = max(0.0, floor(dist_right / cellSize - theta));

      float dist_bottom = bottom - y;
      n_bottom = max(0.0, floor(dist_bottom / cellSize - theta));

    }
  }

  vec4 velocity = vec4(vec2(0.0), 1.0, 0.0);

  for (float i = 0.0; i < 12.0; i += 1.0) {
    for (float j = 0.0; j < 4.0; j += 1.0) {
      float n = left + cellSize * j;
      float m = top + cellSize * n_top + cellSize * i;

      if (n < (left + n_left * cellSize) && m < bottom) {
        velocity.xy += calcAdd(vec2(n / cellSize, m / cellSize) / levelTextureSize, pointPosition.xy);
      }

      n = left + cellSize * i;
      m = top + cellSize * j;

      if (n < (right - n_right * cellSize) && m < (top + n_top * cellSize)) {
        velocity.xy += calcAdd(vec2(n / cellSize, m / cellSize) / levelTextureSize, pointPosition.xy);
      }

      n = right - n_right * cellSize + cellSize * j;
      m = top + cellSize * i;

      if (n < right && m < (bottom - n_bottom * cellSize)) {
        velocity.xy += calcAdd(vec2(n / cellSize, m / cellSize) / levelTextureSize, pointPosition.xy);
      }

      n = left + n_left * cellSize + cellSize * i;
      m = bottom - n_bottom * cellSize + cellSize * j;

      if (n < right && m < bottom) {
        velocity.xy += calcAdd(vec2(n / cellSize, m / cellSize) / levelTextureSize, pointPosition.xy);
      }
    }
  }

  gl_FragColor = velocity;
}