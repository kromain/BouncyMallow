attribute float bounceRatio;
attribute vec3  txoffset;

varying   vec4  outcolor;
varying   vec2  texcoord;


void main(void)
{
    const vec2 origin = vec2(0.0,0.0);

    vec3 vertex = gl_Vertex.xyz;
    float colorRatio = 1.0;

    if (bounceRatio != 1.0) {
        if (vertex.xy == origin) {
            vertex.z *= 2.0 - bounceRatio;
            colorRatio += vertex.z - gl_Vertex.z;
        }
        else if (vertex.xz == origin) {
            vertex.y *= bounceRatio;
            colorRatio += vertex.y - gl_Vertex.y;
        }
        else if (vertex.yz == origin) {
            vertex.x *= bounceRatio;
            colorRatio += vertex.x - gl_Vertex.x;
        }
    }

    outcolor = vec4(colorRatio,colorRatio,colorRatio,1.0);
    texcoord = gl_MultiTexCoord0.xy;

    gl_Position = gl_ModelViewProjectionMatrix * vec4(vertex + txoffset, gl_Vertex.w);
}
