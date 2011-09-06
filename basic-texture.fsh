uniform sampler2D tex;
varying highp vec4 outcolor;
varying highp vec2 texcoord;

void main(void)
{
    vec4 pixcolor = texture2D(tex, texcoord) * outcolor;
    if (pixcolor.a == 0.0) discard;

    gl_FragColor = pixcolor;
}
