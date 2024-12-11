#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D positionsTexture;
uniform sampler2D centermassTexture;
uniform sampler2D clusterTexture;
uniform sampler2D clusterPositionsTexture;
uniform sampler2D clusterForceCoefficient;
uniform float alpha;
uniform float clustersTextureSize;
uniform float clusterCoefficient;

varying vec2 textureCoords;


void main() {
  vec4 pointPosition = texture2D(positionsTexture, textureCoords);
  vec4 velocity = vec4(0.0);
  vec4 pointClusterIndices = texture2D(clusterTexture, textureCoords);
  // no cluster, so no forces
  if (pointClusterIndices.x >= 0.0 && pointClusterIndices.y >= 0.0) {
    // positioning points to custom cluster position or either to the center of mass
    vec2 clusterPositions = texture2D(clusterPositionsTexture, pointClusterIndices.xy / clustersTextureSize).xy;
    if (clusterPositions.x < 0.0 || clusterPositions.y < 0.0) {
      vec4 centermassValues = texture2D(centermassTexture, pointClusterIndices.xy / clustersTextureSize);
      // prevent division by zero
      if (centermassValues.b > 0.0) {
        clusterPositions = centermassValues.xy / centermassValues.b;
      } else {
        clusterPositions = vec2(0.0);
      }
      
    }
    vec4 clusterCustomCoeff = texture2D(clusterForceCoefficient, textureCoords);
    vec2 distVector = clusterPositions.xy - pointPosition.xy;
    float dist = sqrt(dot(distVector, distVector));
    if (dist > 0.0) {
    // For the purpose of debugging
    // if (dist > 100.0) {
      float angle = atan(distVector.y, distVector.x);
      float addV = alpha * dist * clusterCoefficient * clusterCustomCoeff.r;
      velocity.rg += addV * vec2(cos(angle), sin(angle));
    }
  }

  gl_FragColor = velocity;
}