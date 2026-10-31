/* GLSL ES 3.00 シェーダ生成。プログラムは defines の組み合わせごとに遅延生成される。 */
export const MAX_DIR = 2, MAX_POINT = 8;

export function vertexSource(f) {
  return `#version 300 es
precision highp float;
layout(location=0) in vec3 a_position;
layout(location=1) in vec3 a_normal;
layout(location=2) in vec2 a_uv;
layout(location=3) in vec3 a_color;
${f.INSTANCED ? `layout(location=4) in vec4 a_i0;
layout(location=5) in vec4 a_i1;
layout(location=6) in vec4 a_i2;
layout(location=7) in vec4 a_i3;
layout(location=8) in vec4 a_icolor;` : ''}
uniform mat4 u_viewProj;
uniform mat4 u_model;
uniform mat3 u_normalMat;
uniform float u_time;
uniform float u_spin;
${f.SHADOW_RECV ? 'uniform mat4 u_shadowMat; uniform float u_normalBias; out vec4 v_shadow;' : ''}
${f.DEPTH_ONLY ? '' : 'out vec3 v_normal; out vec3 v_world; out vec2 v_uv; out vec3 v_color;'}
void main(){
  vec3 lp = a_position;
  vec3 ln = a_normal;
${f.INSTANCED ? `  mat4 im = mat4(a_i0, a_i1, a_i2, a_i3);
  if (u_spin != 0.0) {
    float a = u_spin * (u_time * (0.25 + fract(a_icolor.w) * 0.5) + a_icolor.w);
    float c = cos(a), s = sin(a);
    mat3 r = mat3(c,0.0,-s, 0.0,1.0,0.0, s,0.0,c);
    lp = r * lp; ln = r * ln;
  }
  vec4 wp = u_model * (im * vec4(lp, 1.0));
  vec3 wn = mat3(u_model) * (mat3(im) * ln);` : `  vec4 wp = u_model * vec4(lp, 1.0);
  vec3 wn = u_normalMat * ln;`}
  gl_Position = u_viewProj * wp;
${f.DEPTH_ONLY ? '' : `  v_world = wp.xyz;
  v_normal = wn;
  v_uv = a_uv;
  v_color = ${f.INSTANCED ? (f.VCOLOR ? 'a_icolor.rgb * a_color' : 'a_icolor.rgb') : (f.VCOLOR ? 'a_color' : 'vec3(1.0)')};`}
${f.SHADOW_RECV ? '  v_shadow = u_shadowMat * vec4(wp.xyz + normalize(wn) * u_normalBias, 1.0);' : ''}
}`;
}

export function fragmentSource(f) {
  if (f.DEPTH_ONLY) return `#version 300 es
precision highp float;
out vec4 outColor;
void main(){ outColor = vec4(1.0); }`;
  return `#version 300 es
precision highp float;
precision highp sampler2DShadow;
in vec3 v_normal; in vec3 v_world; in vec2 v_uv; in vec3 v_color;
out vec4 outColor;
uniform vec3 u_color; uniform float u_opacity; uniform vec3 u_emissive;
uniform float u_specular; uniform float u_shininess; uniform float u_alphaTest;
uniform vec3 u_ambient; uniform vec3 u_cam;
uniform int u_numDir; uniform vec3 u_dirDir[${MAX_DIR}]; uniform vec3 u_dirColor[${MAX_DIR}];
uniform int u_numPoint; uniform vec3 u_pointPos[${MAX_POINT}]; uniform vec4 u_pointColor[${MAX_POINT}];
${f.MAP ? 'uniform sampler2D u_map;' : ''}
${f.SHADOW_RECV ? `uniform sampler2DShadow u_shadowMap; uniform float u_shadowTexel; uniform float u_shadowBias; in vec4 v_shadow;
float shadowFactor(){
  vec3 sc = v_shadow.xyz / v_shadow.w;
  if (sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0 || sc.z > 1.0) return 1.0;
  float s = 0.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++)
    s += texture(u_shadowMap, vec3(sc.xy + vec2(float(x), float(y)) * u_shadowTexel, sc.z - u_shadowBias));
  return s / 9.0;
}` : ''}
void main(){
  vec4 base = vec4(u_color * v_color, 1.0);
${f.MAP ? '  base *= texture(u_map, v_uv);' : ''}
  float alpha = u_opacity * base.a;
${f.ALPHATEST ? '  if (alpha < u_alphaTest) discard;' : ''}
${f.UNLIT ? '  outColor = vec4(base.rgb + u_emissive, alpha);' : `  vec3 N = normalize(v_normal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(u_cam - v_world);
  vec3 light = u_ambient; vec3 spec = vec3(0.0);
  for (int i = 0; i < ${MAX_DIR}; i++) {
    if (i >= u_numDir) break;
    vec3 L = u_dirDir[i]; float nl = max(dot(N, L), 0.0);
    float sh = 1.0;
${f.SHADOW_RECV ? '    if (i == 0) sh = shadowFactor();' : ''}
    light += u_dirColor[i] * nl * sh;
    if (nl > 0.0) spec += u_dirColor[i] * sh * pow(max(dot(N, normalize(L + V)), 0.0), u_shininess);
  }
  for (int i = 0; i < ${MAX_POINT}; i++) {
    if (i >= u_numPoint) break;
    vec3 d = u_pointPos[i] - v_world; float dist = length(d); vec3 L = d / max(dist, 1e-4);
    float w = clamp(1.0 - (dist * dist) / (u_pointColor[i].w * u_pointColor[i].w), 0.0, 1.0);
    float att = w * w; float nl = max(dot(N, L), 0.0);
    light += u_pointColor[i].rgb * nl * att;
    if (nl > 0.0) spec += u_pointColor[i].rgb * att * pow(max(dot(N, normalize(L + V)), 0.0), u_shininess);
  }
  outColor = vec4(base.rgb * light + spec * u_specular + u_emissive, alpha);`}
}`;
}
