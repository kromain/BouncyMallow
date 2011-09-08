// array attributes
attribute   highp   vec4 aVertex;
attribute   highp   vec2 aTexCoord;

// value attributes
attribute   highp   float vBounceRatio;
attribute   highp   vec4  vTxOffset;

// out vars
varying     mediump vec4  outColor;
varying     highp   vec2  outTexCoord;


void main(void)
{
    const vec2 origin = vec2(0.0,0.0);

    vec4 vertex = aVertex;
    float colorRatio = 1.0;

    if (vBounceRatio != 1.0) {
        if (vertex.xy == origin) {
            vertex.z *= vBounceRatio;
            colorRatio += vertex.z - aVertex.z;
        }
        else if (vertex.xz == origin) {
            vertex.y *= vBounceRatio;
            colorRatio += vertex.y - aVertex.y;
        }
        else if (vertex.yz == origin) {
            vertex.x *= vBounceRatio;
            colorRatio += vertex.x - aVertex.x;
        }
    }

    vertex += vTxOffset;
    gl_Position = vertex;

    outColor = vec4(colorRatio,colorRatio,colorRatio,1.0);
    outTexCoord = aTexCoord;
}
