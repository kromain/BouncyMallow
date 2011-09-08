varying mediump vec4      outColor;
varying highp   vec2      outTexCoord;

uniform         sampler2D tex;

void main(void)
{
    vec4 pixColor = texture2D(tex, outTexCoord) * outColor;
    if (pixColor.a == 0.0)
        discard;

    gl_FragColor = pixColor;
}
