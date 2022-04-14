#ifdef GL_ES
precision highp float;
#endif

varying vec2 index;
varying vec3 rgbColor;
varying float alpha;

const float smoothing = 0.9;

void main() {
    if (alpha == 0.0) {
        discard;
    }
    float r = 0.0;
    float delta = 0.0;
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    r = dot(cxy, cxy);
    float opacity = alpha * (1.0 - smoothstep(smoothing, 1.0, r));

    gl_FragColor = vec4(rgbColor, opacity);
}
