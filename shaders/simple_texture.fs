precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D s_texture;

vec4 premultiply(vec4 color)
{
  float a = color.a;
  return vec4(color.rgb * a, a);
}

void main()
{
  gl_FragColor = texture2D(s_texture, v_texCoord);
//	gl_FragColor = premultiply(texture2D(s_texture, v_texCoord));
}
