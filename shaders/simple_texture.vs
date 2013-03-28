uniform mat4 u_mvpMatrix;
attribute vec3 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;
void main()
{
   v_texCoord = a_texCoord;
   vec4 position4 = vec4(a_position, 1.0);
   gl_Position = u_mvpMatrix * position4;
}
