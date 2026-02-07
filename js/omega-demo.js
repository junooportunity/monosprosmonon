// Omega Demo - Pre-rendered Images + Phi/Helix WebGL Post-Process
// Full matrix: Negative × Print × Dye × Variant
// Image naming: neg_XX_print_YY_dye_ZZ_variant.webp

(function() {
    'use strict';

    const CDN_BASE = 'https://pub-adc2c26304504e67aa77e3dedd9dc84e.r2.dev';

    // Elements
    const demoImage = document.getElementById('omega-demo-image');
    const canvas = document.getElementById('helix-canvas');
    const loading = document.getElementById('demo-loading');

    // Omega Controls
    const negativeSelect = document.getElementById('negative-select');
    const dyeSelect = document.getElementById('dye-select');
    const printSelect = document.getElementById('print-select');
    const grainCheck = document.getElementById('grain-check');
    const halationCheck = document.getElementById('halation-check');

    // Phi Controls
    const exposureSlider = document.getElementById('exposure-slider');
    const contrastSlider = document.getElementById('contrast-slider');
    const shadowsSlider = document.getElementById('shadows-slider');
    const midtonesSlider = document.getElementById('midtones-slider');
    const highlightsSlider = document.getElementById('highlights-slider');
    const saturationSlider = document.getElementById('saturation-slider');
    const vibranceSlider = document.getElementById('vibrance-slider');

    // Helix Controls
    const claritySlider = document.getElementById('clarity-slider');
    const microSlider = document.getElementById('micro-slider');

    // WebGL state
    let gl = null;
    let program = null;
    let texture = null;
    let currentImage = null;

    const VERTEX_SHADER = `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }
    `;

    const FRAGMENT_SHADER = `
        precision highp float;
        varying vec2 v_texCoord;
        uniform sampler2D u_image;
        uniform vec2 u_resolution;

        // Phi uniforms
        uniform float u_exposure;
        uniform float u_contrast;
        uniform float u_shadows;
        uniform float u_midtones;
        uniform float u_highlights;
        uniform float u_saturation;
        uniform float u_vibrance;

        // Helix uniforms
        uniform float u_clarity;
        uniform float u_micro;

        float luminance(vec3 rgb) {
            return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
        }

        void main() {
            vec2 px = 1.0 / u_resolution;
            vec3 rgb = texture2D(u_image, v_texCoord).rgb;

            // === PHI PROCESSING ===

            // Exposure
            if (abs(u_exposure) > 0.001) {
                rgb *= pow(2.0, u_exposure);
            }

            // Contrast (around middle gray)
            if (abs(u_contrast - 1.0) > 0.001) {
                rgb = (rgb - 0.5) * u_contrast + 0.5;
            }

            float lum = luminance(rgb);

            // Shadows
            if (abs(u_shadows) > 0.001) {
                float shadowWeight = 1.0 - smoothstep(0.0, 0.35, lum);
                rgb += u_shadows * shadowWeight * 0.3;
            }

            // Midtones
            if (abs(u_midtones) > 0.001) {
                float midWeight = 1.0 - abs(lum - 0.5) * 2.5;
                midWeight = max(0.0, midWeight);
                rgb += u_midtones * midWeight * 0.2;
            }

            // Highlights
            if (abs(u_highlights) > 0.001) {
                float hlWeight = smoothstep(0.5, 1.0, lum);
                rgb += u_highlights * hlWeight * 0.3;
            }

            // Saturation
            if (abs(u_saturation) > 0.001) {
                float gray = luminance(rgb);
                rgb = mix(vec3(gray), rgb, 1.0 + u_saturation);
            }

            // Vibrance (boost less saturated colors)
            if (abs(u_vibrance) > 0.001) {
                float maxC = max(max(rgb.r, rgb.g), rgb.b);
                float minC = min(min(rgb.r, rgb.g), rgb.b);
                float sat = (maxC - minC) / (maxC + 0.001);
                float vibranceWeight = 1.0 - sat;
                float gray = luminance(rgb);
                rgb = mix(vec3(gray), rgb, 1.0 + u_vibrance * vibranceWeight);
            }

            // === HELIX PROCESSING ===

            lum = luminance(rgb);

            // Clarity
            if (abs(u_clarity) > 0.01) {
                vec3 blur = vec3(0.0);
                float samples = 0.0;
                for (int i = 0; i < 8; i++) {
                    float angle = float(i) * 0.785398;
                    vec2 offset = vec2(cos(angle), sin(angle)) * 8.0 * px;
                    blur += texture2D(u_image, v_texCoord + offset).rgb;
                    samples += 1.0;
                }
                for (int i = 0; i < 8; i++) {
                    float angle = float(i) * 0.785398 + 0.392699;
                    vec2 offset = vec2(cos(angle), sin(angle)) * 15.0 * px;
                    blur += texture2D(u_image, v_texCoord + offset).rgb;
                    samples += 1.0;
                }
                blur /= samples;
                vec3 detail = rgb - blur;
                float midWeight = exp(-pow(lum - 0.45, 2.0) * 8.0);
                float clarityGain = u_clarity * 0.4 * midWeight;
                rgb = clamp(rgb + detail * clarityGain, 0.0, 1.0);
            }

            // Micro-contrast
            if (abs(u_micro) > 0.01) {
                vec3 microBlur = vec3(0.0);
                float samples = 0.0;
                for (int i = 0; i < 8; i++) {
                    float angle = 2.39996323 * float(i);
                    vec2 offset = vec2(cos(angle), sin(angle)) * 1.5 * px;
                    microBlur += texture2D(u_image, v_texCoord + offset).rgb;
                    samples += 1.0;
                }
                for (int i = 0; i < 8; i++) {
                    float angle = 2.39996323 * float(i + 8);
                    vec2 offset = vec2(cos(angle), sin(angle)) * 3.0 * px;
                    microBlur += texture2D(u_image, v_texCoord + offset).rgb;
                    samples += 1.0;
                }
                microBlur /= samples;
                float lumDetail = lum - luminance(microBlur);
                float hlFade = 1.0 - clamp((lum - 0.7) / 0.25, 0.0, 1.0);
                hlFade = hlFade * hlFade * (3.0 - 2.0 * hlFade);
                float microGain = u_micro * 0.8 * hlFade;
                rgb = clamp(rgb + lumDetail * microGain, 0.0, 1.0);
            }

            gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), 1.0);
        }
    `;

    function initWebGL() {
        if (!canvas) return false;
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return false;

        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, VERTEX_SHADER);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            console.error('VS:', gl.getShaderInfoLog(vs));
            return false;
        }

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, FRAGMENT_SHADER);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.error('FS:', gl.getShaderInfoLog(fs));
            return false;
        }

        program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Link:', gl.getProgramInfoLog(program));
            return false;
        }

        gl.useProgram(program);

        const positions = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
        const texCoords = new Float32Array([0,1, 1,1, 0,0, 1,0]);

        const posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        const posLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        const texBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
        const texLoc = gl.getAttribLocation(program, 'a_texCoord');
        gl.enableVertexAttribArray(texLoc);
        gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        return true;
    }

    function render() {
        if (!gl || !program || !currentImage) return;
        canvas.width = currentImage.naturalWidth;
        canvas.height = currentImage.naturalHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, currentImage);

        // Resolution
        gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height);

        // Phi uniforms
        gl.uniform1f(gl.getUniformLocation(program, 'u_exposure'), parseFloat(exposureSlider?.value || 0));
        gl.uniform1f(gl.getUniformLocation(program, 'u_contrast'), parseFloat(contrastSlider?.value || 1));
        gl.uniform1f(gl.getUniformLocation(program, 'u_shadows'), parseFloat(shadowsSlider?.value || 0));
        gl.uniform1f(gl.getUniformLocation(program, 'u_midtones'), parseFloat(midtonesSlider?.value || 0));
        gl.uniform1f(gl.getUniformLocation(program, 'u_highlights'), parseFloat(highlightsSlider?.value || 0));
        gl.uniform1f(gl.getUniformLocation(program, 'u_saturation'), parseFloat(saturationSlider?.value || 0));
        gl.uniform1f(gl.getUniformLocation(program, 'u_vibrance'), parseFloat(vibranceSlider?.value || 0));

        // Helix uniforms
        gl.uniform1f(gl.getUniformLocation(program, 'u_clarity'), parseFloat(claritySlider?.value || 0) / 100);
        gl.uniform1f(gl.getUniformLocation(program, 'u_micro'), parseFloat(microSlider?.value || 0) / 100);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function getVariant() {
        const grain = grainCheck?.checked || false;
        const halation = halationCheck?.checked || false;
        if (grain && halation) return 'both';
        if (grain) return 'grain';
        if (halation) return 'halation';
        return 'none';
    }

    function getImageUrl() {
        const negId = parseInt(negativeSelect?.value || '3').toString().padStart(2, '0');
        const printId = parseInt(printSelect?.value || '1').toString().padStart(2, '0');
        const dyeId = parseInt(dyeSelect?.value || '0').toString().padStart(2, '0');
        const variant = getVariant();
        return `${CDN_BASE}/neg_${negId}_print_${printId}_dye_${dyeId}_${variant}.webp`;
    }

    function updateImage() {
        const url = getImageUrl();
        console.log('Loading:', url);
        if (loading) loading.classList.add('active');

        const img = new Image();
        if (gl) {
            img.crossOrigin = 'anonymous';  // Only needed for WebGL texturing
        }
        img.onload = function() {
            currentImage = img;
            if (gl) {
                render();
                canvas.style.display = 'block';
                if (demoImage) demoImage.style.display = 'none';
            } else {
                if (demoImage) {
                    demoImage.src = url;
                    demoImage.style.opacity = '1';
                    demoImage.style.display = 'block';
                }
                if (canvas) canvas.style.display = 'none';
            }
            if (loading) loading.classList.remove('active');
        };
        img.onerror = function() {
            console.error('Failed to load:', url);
            if (loading) loading.classList.remove('active');
        };
        img.src = url;
    }

    // Initialize
    const webglEnabled = initWebGL();
    if (!webglEnabled && canvas) {
        canvas.style.display = 'none';
    }

    // Omega controls - change image
    negativeSelect?.addEventListener('change', updateImage);
    dyeSelect?.addEventListener('change', updateImage);
    printSelect?.addEventListener('change', updateImage);
    grainCheck?.addEventListener('change', updateImage);
    halationCheck?.addEventListener('change', updateImage);

    // Phi controls - re-render
    exposureSlider?.addEventListener('input', render);
    contrastSlider?.addEventListener('input', render);
    shadowsSlider?.addEventListener('input', render);
    midtonesSlider?.addEventListener('input', render);
    highlightsSlider?.addEventListener('input', render);
    saturationSlider?.addEventListener('input', render);
    vibranceSlider?.addEventListener('input', render);

    // Helix controls - re-render
    claritySlider?.addEventListener('input', render);
    microSlider?.addEventListener('input', render);

    // Initial load
    updateImage();

})();
