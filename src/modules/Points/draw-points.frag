// Fragment shader for rendering points with a smooth circular edge

#ifdef GL_ES
precision highp float;
#endif

// The color and alpha values from the vertex shader
varying vec3 rgbColor;
varying float alpha;

// Smoothing control the smoothness of the point’s edge
const float smoothing = 0.9;

void main() {
    // Discard the fragment if the point is fully transparent
    if (alpha == 0.0) { discard; }

    // Calculate coordinates within the point
    vec2 pointCoord = 2.0 * gl_PointCoord - 1.0;
    // Calculate squared distance from the center
    float pointCenterDistance = dot(pointCoord, pointCoord);
    // Calculate opacity based on distance and smoothing
    float opacity = alpha * (1.0 - smoothstep(smoothing, 1.0, pointCenterDistance));

    gl_FragColor = vec4(rgbColor, opacity);
}
