// array attributes
attribute   highp   vec4 aVertex;

// uniform attributes
uniform     highp   mat4  cameraMatrix;
uniform     highp   mat4  projectionMatrix;

// out vars
varying     highp   vec3  cubemapCoord;


void main(void)
{
    gl_Position = projectionMatrix * cameraMatrix * aVertex;
    cubemapCoord = aVertex.xyz;
}
