varying highp   vec3      cubemapCoord;

uniform         samplerCube cubemapTex;

void main(void)
{
    gl_FragColor = textureCube(cubemapTex, cubemapCoord);
//    gl_FragColor = vec4(cubemapCoord.xyz, 255);
}
