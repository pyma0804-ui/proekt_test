/**
 * Порт React Bits / shadcn Lightning на чистый JS.
 * Цвета под сайт: оттенок ≈ #1C3F66 (hue ~214°), приглушённая насыщенность.
 * При prefers-reduced-motion слой скрыт в CSS; скрипт не стартует.
 */
(function () {
  "use strict";

  var root = document.querySelector(".hero__lightning");
  if (!root) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var canvas = root.querySelector("canvas.lightning-container");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "lightning-container";
    canvas.setAttribute("aria-hidden", "true");
    root.appendChild(canvas);
  }

  function readFloat(name, fallback) {
    var v = parseFloat(root.getAttribute(name));
    return isNaN(v) ? fallback : v;
  }

  var hue = readFloat("data-hue", 214);
  var xOffset = readFloat("data-x-offset", 0);
  var speed = readFloat("data-speed", 0.85);
  var intensity = readFloat("data-intensity", 0.52);
  var size = readFloat("data-size", 1.05);
  var saturation = readFloat("data-saturation", 0.48);
  var brightness = readFloat("data-brightness", 0.62);

  var gl = canvas.getContext("webgl", { alpha: true, antialias: false, powerPreference: "low-power" });
  if (!gl) return;

  var vertexShaderSource =
    "attribute vec2 aPosition;\n" +
    "void main() {\n" +
    "  gl_Position = vec4(aPosition, 0.0, 1.0);\n" +
    "}\n";

  var fragmentShaderSource =
    "precision mediump float;\n" +
    "uniform vec2 iResolution;\n" +
    "uniform float iTime;\n" +
    "uniform float uHue;\n" +
    "uniform float uXOffset;\n" +
    "uniform float uSpeed;\n" +
    "uniform float uIntensity;\n" +
    "uniform float uSize;\n" +
    "uniform float uSaturation;\n" +
    "uniform float uBrightness;\n" +
    "#define OCTAVE_COUNT 10\n" +
    "vec3 hsv2rgb(vec3 c) {\n" +
    "  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);\n" +
    "  return c.z * mix(vec3(1.0), rgb, c.y);\n" +
    "}\n" +
    "float hash11(float p) {\n" +
    "  p = fract(p * .1031);\n" +
    "  p *= p + 33.33;\n" +
    "  p *= p + p;\n" +
    "  return fract(p);\n" +
    "}\n" +
    "float hash12(vec2 p) {\n" +
    "  vec3 p3 = fract(vec3(p.xyx) * .1031);\n" +
    "  p3 += dot(p3, p3.yzx + 33.33);\n" +
    "  return fract((p3.x + p3.y) * p3.z);\n" +
    "}\n" +
    "mat2 rotate2d(float theta) {\n" +
    "  float c = cos(theta);\n" +
    "  float s = sin(theta);\n" +
    "  return mat2(c, -s, s, c);\n" +
    "}\n" +
    "float noise(vec2 p) {\n" +
    "  vec2 ip = floor(p);\n" +
    "  vec2 fp = fract(p);\n" +
    "  float a = hash12(ip);\n" +
    "  float b = hash12(ip + vec2(1.0, 0.0));\n" +
    "  float c = hash12(ip + vec2(0.0, 1.0));\n" +
    "  float d = hash12(ip + vec2(1.0, 1.0));\n" +
    "  vec2 t = smoothstep(0.0, 1.0, fp);\n" +
    "  return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);\n" +
    "}\n" +
    "float fbm(vec2 p) {\n" +
    "  float value = 0.0;\n" +
    "  float amplitude = 0.5;\n" +
    "  for (int i = 0; i < OCTAVE_COUNT; ++i) {\n" +
    "    value += amplitude * noise(p);\n" +
    "    p *= rotate2d(0.45);\n" +
    "    p *= 2.0;\n" +
    "    amplitude *= 0.5;\n" +
    "  }\n" +
    "  return value;\n" +
    "}\n" +
    "void mainImage(out vec4 fragColor, in vec2 fragCoord) {\n" +
    "  vec2 uv = fragCoord / iResolution.xy;\n" +
    "  uv = 2.0 * uv - 1.0;\n" +
    "  uv.x *= iResolution.x / iResolution.y;\n" +
    "  uv.x += uXOffset;\n" +
    "  uv += 2.0 * fbm(uv * uSize + 0.8 * iTime * uSpeed) - 1.0;\n" +
    "  float dist = abs(uv.x);\n" +
    "  vec3 baseColor = hsv2rgb(vec3(uHue / 360.0, uSaturation, uBrightness));\n" +
    "  vec3 col = baseColor * pow(mix(0.0, 0.07, hash11(iTime * uSpeed)) / dist, 1.0) * uIntensity;\n" +
    "  col = pow(col, vec3(1.0));\n" +
    "  fragColor = vec4(col, 1.0);\n" +
    "}\n" +
    "void main() {\n" +
    "  mainImage(gl_FragColor, gl_FragCoord.xy);\n" +
    "}\n";

  function compileShader(source, type) {
    var shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  var vs = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
  var fs = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
  if (!vs || !fs) return;

  var program = gl.createProgram();
  if (!program) return;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  var vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
  var vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  var aPosition = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  var locResolution = gl.getUniformLocation(program, "iResolution");
  var locTime = gl.getUniformLocation(program, "iTime");
  var locHue = gl.getUniformLocation(program, "uHue");
  var locXOffset = gl.getUniformLocation(program, "uXOffset");
  var locSpeed = gl.getUniformLocation(program, "uSpeed");
  var locIntensity = gl.getUniformLocation(program, "uIntensity");
  var locSize = gl.getUniformLocation(program, "uSize");
  var locSat = gl.getUniformLocation(program, "uSaturation");
  var locBright = gl.getUniformLocation(program, "uBrightness");

  function resizeCanvas() {
    var w = Math.max(1, Math.floor(root.clientWidth));
    var h = Math.max(1, Math.floor(root.clientHeight));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  var startTime = performance.now();
  var rafId = 0;

  function render() {
    if (document.hidden) {
      rafId = requestAnimationFrame(render);
      return;
    }

    resizeCanvas();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(locResolution, canvas.width, canvas.height);
    gl.uniform1f(locTime, (performance.now() - startTime) / 1000);
    gl.uniform1f(locHue, hue);
    gl.uniform1f(locXOffset, xOffset);
    gl.uniform1f(locSpeed, speed);
    gl.uniform1f(locIntensity, intensity);
    gl.uniform1f(locSize, size);
    gl.uniform1f(locSat, saturation);
    gl.uniform1f(locBright, brightness);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    rafId = requestAnimationFrame(render);
  }

  resizeCanvas();
  rafId = requestAnimationFrame(render);

  var ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resizeCanvas) : null;
  if (ro) ro.observe(root);
  window.addEventListener("resize", resizeCanvas);

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener("resize", resizeCanvas);
    if (ro) ro.disconnect();
  }

  window.addEventListener("pagehide", stop, { once: true });
})();
