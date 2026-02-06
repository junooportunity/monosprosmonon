// Omega + Phi + Helix Combined WebGL Shader
// Full film emulation pipeline: LogC3 → Linear → Phi → Omega → Helix → Output

const OMEGA_VERTEX_SHADER = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
    }
`;

const OMEGA_FRAGMENT_SHADER = `
    precision highp float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    uniform vec2 u_resolution;
    uniform vec2 u_sourceSize;
    uniform float u_scale;

    // ==================== INPUT/OUTPUT ====================
    uniform float u_inputSpace;   // 0=LogC3, 1=LogC4, 2=DI, 3=ACEScct, 4=SLog3, 5=Log3G10, 6=Linear
    uniform float u_outputSpace;  // 0=Rec709, 1=709/2.2, 2=P3-D65, 3=P3-DCI, 4=Rec2020, 5=P3-Display
    uniform float u_outputGamma;

    // ==================== PHI UNIFORMS ====================
    // Printer Lights
    uniform float u_phiPrinterR, u_phiPrinterG, u_phiPrinterB;

    // Tone
    uniform float u_exposure;
    uniform float u_shadows;
    uniform float u_midtones;
    uniform float u_highlights;

    // Saturation (main controls)
    uniform float u_saturation;
    uniform float u_vibrance;

    // Skin
    uniform float u_skinTexture;
    uniform float u_skinRedness;

    // ==================== OMEGA UNIFORMS ====================
    uniform float u_omegaEnable;

    // Negative stock params
    uniform float u_filmLogMid;
    uniform float u_hdGamma;
    uniform float u_hlCompress;
    uniform float u_printerR, u_printerG, u_printerB;

    // H&D curve
    uniform float u_hdCeilingR, u_hdCeilingG, u_hdCeilingB;
    uniform float u_hdShoulder;
    uniform float u_hdRedMult, u_hdGreenMult, u_hdBlueMult;
    uniform float u_hdGammaR, u_hdGammaG, u_hdGammaB;
    uniform float u_middleGray;
    uniform float u_hdCrosstalk;
    uniform float u_hdBlack;

    // Color matrix
    uniform float u_mtx_rR, u_mtx_gR, u_mtx_bR;
    uniform float u_mtx_rG, u_mtx_gG, u_mtx_bG;
    uniform float u_mtx_rB, u_mtx_gB, u_mtx_bB;
    uniform float u_mtx_presNeut;

    // 6-vector saturation
    uniform float u_desat_global;
    uniform float u_desat_red, u_desat_green, u_desat_blue;
    uniform float u_desat_cyan, u_desat_magenta, u_desat_yellow;

    // Skin
    uniform float u_skinMelanin, u_skinHemoglobin;
    uniform float u_skinRichness, u_skinDensity;

    // Tone mapping
    uniform float u_contrast, u_whitePoint;
    uniform float u_blackOffset, u_blackPoint;

    // Print stock
    uniform float u_printContrast, u_printWarmth, u_printSaturation;

    // Development
    uniform float u_pushPull;
    uniform float u_bleachBypass;
    uniform float u_interlayer;

    // Halation
    uniform float u_halationEnable;
    uniform float u_halationStrength;

    // Grain
    uniform float u_grainEnable;
    uniform float u_grainAmount;
    uniform float u_grainSaturation;

    // ==================== HELIX UNIFORMS ====================
    uniform float u_clarityAmount, u_clarityEnable;
    uniform float u_microAmount, u_microEnable;
    uniform float u_z1, u_z2, u_z3, u_z4, u_z5, u_z6;
    uniform float u_spatialMix, u_spatialEnable;
    uniform float u_globalMix;

    // ==================== CONSTANTS ====================
    const float PI = 3.14159265359;
    const float GOLDEN_ANGLE = 2.39996323;

    // ==================== COLOR SPACE CONVERSIONS ====================

    float logc3_to_linear(float x) {
        float cut = 0.010591;
        float a = 5.555556;
        float b = 0.052272;
        float c = 0.247190;
        float d = 0.385537;
        float e = 5.367655;
        float f = 0.092809;
        if (x > e * cut + f)
            return (pow(10.0, (x - d) / c) - b) / a;
        return (x - f) / e;
    }

    float logc4_to_linear(float x) {
        float a = 2231.82630906769;
        float b = 64.0;
        float c = 0.0740005604622393;
        float s = 0.0181680833820122;
        float t = 0.0729553821550654;
        if (x >= t)
            return (pow(2.0, (x - c) / 0.0573514609390792) - b) / a;
        return (x - t) / s;
    }

    float davinci_intermediate_to_linear(float x) {
        if (x <= 0.00262409)
            return x / 10.44426855;
        return pow(2.0, (x / 0.07329248) - 7.0) - 0.0007623801;
    }

    float acescct_to_linear(float x) {
        if (x <= 0.155251141552511)
            return (x - 0.0729055341958355) / 10.5402377416545;
        return pow(2.0, x * 17.52 - 9.72);
    }

    float slog3_to_linear(float x) {
        if (x >= 171.2102946929 / 1023.0)
            return pow(10.0, (x * 1023.0 - 420.0) / 261.5) * (0.18 + 0.01) - 0.01;
        return (x * 1023.0 - 95.0) * 0.01125 / (171.2102946929 - 95.0);
    }

    float log3g10_to_linear(float x) {
        float a = 0.224282;
        float b = 155.975327;
        float c_val = 0.01;
        if (x < 0.0) return x * 0.01;
        return (pow(10.0, x / a) - 1.0) / b - c_val;
    }

    vec3 input_to_linear(vec3 rgb) {
        int space = int(u_inputSpace);
        if (space == 0) { // LogC3
            return vec3(logc3_to_linear(rgb.r), logc3_to_linear(rgb.g), logc3_to_linear(rgb.b));
        } else if (space == 1) { // LogC4
            return vec3(logc4_to_linear(rgb.r), logc4_to_linear(rgb.g), logc4_to_linear(rgb.b));
        } else if (space == 2) { // DaVinci Intermediate
            return vec3(davinci_intermediate_to_linear(rgb.r), davinci_intermediate_to_linear(rgb.g), davinci_intermediate_to_linear(rgb.b));
        } else if (space == 3) { // ACEScct
            return vec3(acescct_to_linear(rgb.r), acescct_to_linear(rgb.g), acescct_to_linear(rgb.b));
        } else if (space == 4) { // S-Log3
            return vec3(slog3_to_linear(rgb.r), slog3_to_linear(rgb.g), slog3_to_linear(rgb.b));
        } else if (space == 5) { // Log3G10
            return vec3(log3g10_to_linear(rgb.r), log3g10_to_linear(rgb.g), log3g10_to_linear(rgb.b));
        }
        return rgb; // Linear passthrough
    }

    // AWG3 to AP1 matrix
    vec3 awg3_to_ap1(vec3 rgb) {
        return vec3(
            0.6954522414 * rgb.r + 0.1406786965 * rgb.g + 0.1638690622 * rgb.b,
            0.0447945634 * rgb.r + 0.8596711185 * rgb.g + 0.0955343182 * rgb.b,
            -0.0055258826 * rgb.r + 0.0040252103 * rgb.g + 1.0015006723 * rgb.b
        );
    }

    // AP1 to output gamut
    vec3 ap1_to_output(vec3 rgb) {
        int space = int(u_outputSpace);
        if (space == 0 || space == 1) { // Rec.709
            return vec3(
                1.7050509310 * rgb.r - 0.6217921092 * rgb.g - 0.0832588218 * rgb.b,
                -0.1302564175 * rgb.r + 1.1408047365 * rgb.g - 0.0105483190 * rgb.b,
                -0.0240033568 * rgb.r - 0.1289689761 * rgb.g + 1.1529723329 * rgb.b
            );
        } else if (space == 2 || space == 3 || space == 5) { // P3
            return vec3(
                1.2249401763 * rgb.r - 0.2249401763 * rgb.g + 0.0 * rgb.b,
                -0.0420569547 * rgb.r + 1.0420569547 * rgb.g + 0.0 * rgb.b,
                -0.0196375546 * rgb.r - 0.0786360476 * rgb.g + 1.0982736022 * rgb.b
            );
        } else if (space == 4) { // Rec.2020
            return vec3(
                1.0258246689 * rgb.r - 0.0200052028 * rgb.g - 0.0058194661 * rgb.b,
                -0.0022312282 * rgb.r + 1.0045828042 * rgb.g - 0.0023515760 * rgb.b,
                -0.0050217681 * rgb.r - 0.0252618954 * rgb.g + 1.0302836635 * rgb.b
            );
        }
        return rgb;
    }

    // Gamma encoding
    vec3 apply_gamma(vec3 rgb) {
        float g = 1.0 / u_outputGamma;
        return vec3(
            rgb.r > 0.0 ? pow(rgb.r, g) : 0.0,
            rgb.g > 0.0 ? pow(rgb.g, g) : 0.0,
            rgb.b > 0.0 ? pow(rgb.b, g) : 0.0
        );
    }

    // ==================== PHI PROCESSING ====================

    float luminance(vec3 rgb) {
        return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
    }

    // Phi Printer Lights (exposure adjustment per channel)
    vec3 applyPhiPrinterLights(vec3 rgb) {
        return rgb * vec3(
            pow(2.0, u_phiPrinterR),
            pow(2.0, u_phiPrinterG),
            pow(2.0, u_phiPrinterB)
        );
    }

    // Phi Exposure
    vec3 applyExposure(vec3 rgb) {
        return rgb * pow(2.0, u_exposure);
    }

    // Phi Shadows/Midtones/Highlights
    vec3 applySMH(vec3 rgb) {
        float lum = luminance(rgb);

        // Shadows: affect low luminance
        if (abs(u_shadows) > 0.001) {
            float shadowWeight = 1.0 - smoothstep(0.0, 0.35, lum);
            float shadowAdj = 1.0 + u_shadows * shadowWeight * 0.5;
            rgb = rgb * shadowAdj;
        }

        // Midtones: affect middle luminance
        if (abs(u_midtones) > 0.001) {
            float midWeight = 1.0 - abs(lum - 0.5) * 2.5;
            midWeight = max(0.0, midWeight);
            float midAdj = 1.0 + u_midtones * midWeight * 0.3;
            rgb = rgb * midAdj;
        }

        // Highlights: affect high luminance
        if (abs(u_highlights) > 0.001) {
            float hlWeight = smoothstep(0.5, 1.0, lum);
            float hlAdj = 1.0 + u_highlights * hlWeight * 0.5;
            rgb = rgb * hlAdj;
        }

        return rgb;
    }

    // Phi Saturation and Vibrance
    vec3 applyPhiSaturation(vec3 rgb) {
        float lum = luminance(rgb);

        // Main saturation
        if (abs(u_saturation) > 0.001) {
            float satScale = 1.0 + u_saturation;
            rgb = vec3(
                lum + (rgb.r - lum) * satScale,
                lum + (rgb.g - lum) * satScale,
                lum + (rgb.b - lum) * satScale
            );
        }

        // Vibrance: boost less saturated colors more
        if (abs(u_vibrance) > 0.001) {
            float maxC = max(max(rgb.r, rgb.g), rgb.b);
            float minC = min(min(rgb.r, rgb.g), rgb.b);
            float currentSat = (maxC - minC) / (maxC + 0.0001);
            float vibranceWeight = 1.0 - currentSat;
            float vibScale = 1.0 + u_vibrance * vibranceWeight;
            rgb = vec3(
                lum + (rgb.r - lum) * vibScale,
                lum + (rgb.g - lum) * vibScale,
                lum + (rgb.b - lum) * vibScale
            );
        }

        return rgb;
    }

    vec3 processPhi(vec3 rgb) {
        // Printer lights
        rgb = applyPhiPrinterLights(rgb);

        // Exposure
        rgb = applyExposure(rgb);

        // Shadows/Midtones/Highlights
        rgb = applySMH(rgb);

        // Saturation and Vibrance
        rgb = applyPhiSaturation(rgb);

        return rgb;
    }

    // ==================== OMEGA PROCESSING ====================

    // H&D Curve (core film characteristic)
    float hdCurve(float lin, float d_min, float d_max, float gamma, float log_mid, float shoulder) {
        if (lin <= 0.0) return d_max;
        float log_exp = log(lin) / log(10.0); // log10
        float t = gamma * 4.0 * (log_exp - log_mid);
        float s = 1.0 / (1.0 + exp(-t));
        float density = d_min + (d_max - d_min) * (1.0 - s);

        // Highlight shoulder
        if (shoulder > 0.0 && density < d_min + 0.5 * (d_max - d_min)) {
            float highlight_zone = (d_min + 0.5 * (d_max - d_min) - density) / (0.5 * (d_max - d_min));
            float compression = shoulder * highlight_zone * highlight_zone * 0.15 * (d_max - d_min);
            density = density + compression;
        }

        return density;
    }

    // Piecewise contrast
    float piecewise(float x, float c, float p) {
        float sign = x < 0.0 ? -1.0 : 1.0;
        x = abs(x);
        float scale = 1.0;
        if (x > 1.0) { scale = x; x = 1.0; }
        float safe_p = clamp(p, 0.001, 0.999);
        float out_val;
        if (c <= 0.001) {
            out_val = x;
        } else if (x <= safe_p) {
            out_val = pow(x / safe_p, c) * safe_p;
        } else {
            out_val = 1.0 - pow((1.0 - x) / (1.0 - safe_p), c) * (1.0 - safe_p);
        }
        return sign * out_val * scale;
    }

    // Color matrix with preserve neutrals
    vec3 applyColorMatrix(vec3 rgb) {
        float luma = luminance(rgb);
        vec3 matted = vec3(
            u_mtx_rR * rgb.r + u_mtx_gR * rgb.g + u_mtx_bR * rgb.b,
            u_mtx_rG * rgb.r + u_mtx_gG * rgb.g + u_mtx_bG * rgb.b,
            u_mtx_rB * rgb.r + u_mtx_gB * rgb.g + u_mtx_bB * rgb.b
        );

        if (u_mtx_presNeut > 0.5) {
            // Preserve neutrals
            float saturation = max(max(abs(rgb.r - luma), abs(rgb.g - luma)), abs(rgb.b - luma));
            float blend = clamp(saturation * 5.0, 0.0, 1.0);
            return mix(rgb, matted, blend);
        }
        return matted;
    }

    // 6-vector saturation
    vec3 applySaturation6Vec(vec3 rgb) {
        float luma = luminance(rgb);
        float r = rgb.r, g = rgb.g, b = rgb.b;

        // Determine dominant hue weights
        float maxC = max(max(r, g), b);
        float minC = min(min(r, g), b);
        float delta = maxC - minC + 0.0001;

        // Calculate hue weights (soft transitions)
        float redWeight = clamp((r - max(g, b)) / delta + 0.5, 0.0, 1.0);
        float greenWeight = clamp((g - max(r, b)) / delta + 0.5, 0.0, 1.0);
        float blueWeight = clamp((b - max(r, g)) / delta + 0.5, 0.0, 1.0);
        float cyanWeight = clamp((min(g, b) - r) / delta + 0.5, 0.0, 1.0);
        float magentaWeight = clamp((min(r, b) - g) / delta + 0.5, 0.0, 1.0);
        float yellowWeight = clamp((min(r, g) - b) / delta + 0.5, 0.0, 1.0);

        // Compute per-channel saturation adjustment
        float satAdj = 1.0 + u_desat_global +
            u_desat_red * redWeight +
            u_desat_green * greenWeight +
            u_desat_blue * blueWeight +
            u_desat_cyan * cyanWeight +
            u_desat_magenta * magentaWeight +
            u_desat_yellow * yellowWeight;

        satAdj = max(0.0, satAdj);

        return vec3(
            luma + (r - luma) * satAdj,
            luma + (g - luma) * satAdj,
            luma + (b - luma) * satAdj
        );
    }

    // Skin tone adjustment
    vec3 applySkin(vec3 rgb) {
        float r = rgb.r, g = rgb.g, b = rgb.b;
        float warmth = max(0.0, r - g);
        float skinWeight = min(1.0, warmth * 5.0);

        if (skinWeight > 0.01) {
            if (abs(u_skinMelanin) > 0.001) {
                float melEff = u_skinMelanin * abs(u_skinMelanin);
                float shift = melEff * 0.2 * skinWeight;
                r = r - shift * 0.3;
                g = g - shift * 0.5;
                b = b - shift * 0.8;
            }
            if (abs(u_skinHemoglobin) > 0.001) {
                float hemoEff = u_skinHemoglobin * abs(u_skinHemoglobin) * skinWeight;
                r = r + hemoEff * 0.08;
                g = g - hemoEff * 0.04;
                b = b - hemoEff * 0.02;
            }
            if (abs(u_skinRichness) > 0.001) {
                float richEff = u_skinRichness * abs(u_skinRichness) * 0.5 + u_skinRichness * 0.5;
                float lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                float satScale = 1.0 + richEff * 0.5 * skinWeight;
                r = lum + (r - lum) * satScale;
                g = lum + (g - lum) * satScale;
                b = lum + (b - lum) * satScale;
            }
            if (abs(u_skinDensity) > 0.001) {
                float densEff = u_skinDensity * skinWeight * 0.3;
                r = r + densEff;
                g = g + densEff;
                b = b + densEff;
            }
            // Reduce redness
            if (abs(u_skinRedness) > 0.001) {
                float redEff = u_skinRedness * skinWeight;
                r = r - redEff * 0.1;
                g = g + redEff * 0.02;
            }
        }
        return vec3(r, g, b);
    }

    // Print stock application
    vec3 applyPrintStock(vec3 rgb) {
        float luma = luminance(rgb);

        // Warmth
        if (abs(u_printWarmth) > 0.001) {
            rgb.r = rgb.r * (1.0 + u_printWarmth * 0.5);
            rgb.b = rgb.b * (1.0 - u_printWarmth * 0.5);
        }

        // Print saturation
        rgb = mix(vec3(luma), rgb, u_printSaturation);

        // Print contrast (subtle)
        rgb = vec3(
            piecewise(rgb.r - 0.18, u_printContrast, 0.18) + 0.18,
            piecewise(rgb.g - 0.18, u_printContrast, 0.18) + 0.18,
            piecewise(rgb.b - 0.18, u_printContrast, 0.18) + 0.18
        );

        return rgb;
    }

    // Push/Pull development
    vec3 applyPushPull(vec3 rgb) {
        if (abs(u_pushPull) < 0.001) return rgb;
        // Push increases contrast and grain, pull decreases
        float pushAdj = pow(2.0, u_pushPull * 0.5);
        return rgb * pushAdj;
    }

    // Bleach bypass
    vec3 applyBleachBypass(vec3 rgb) {
        if (u_bleachBypass < 0.001) return rgb;
        float luma = luminance(rgb);
        // Blend with desaturated, higher contrast version
        vec3 bleached = vec3(luma);
        bleached = mix(bleached, rgb, 0.4); // Partial desat
        // Boost contrast
        bleached = vec3(
            piecewise(bleached.r - 0.18, 1.3, 0.18) + 0.18,
            piecewise(bleached.g - 0.18, 1.3, 0.18) + 0.18,
            piecewise(bleached.b - 0.18, 1.3, 0.18) + 0.18
        );
        return mix(rgb, bleached, u_bleachBypass);
    }

    // Simple noise for grain
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    // Grain
    vec3 applyGrain(vec3 rgb) {
        if (u_grainEnable < 0.5 || u_grainAmount < 0.001) return rgb;

        vec2 coord = v_texCoord * u_resolution;
        float noise = hash(coord) * 2.0 - 1.0;
        float grainIntensity = u_grainAmount * 0.05;

        // Film grain is more visible in midtones
        float lum = luminance(rgb);
        float midWeight = 1.0 - abs(lum - 0.5) * 2.0;
        midWeight = max(0.2, midWeight);

        float grainEffect = noise * grainIntensity * midWeight;

        // Color grain
        vec3 grainColor = vec3(grainEffect);
        if (u_grainSaturation > 0.001) {
            float noiseR = hash(coord + vec2(13.0, 17.0)) * 2.0 - 1.0;
            float noiseB = hash(coord + vec2(31.0, 37.0)) * 2.0 - 1.0;
            grainColor = vec3(
                grainEffect + noiseR * grainIntensity * u_grainSaturation * 0.3,
                grainEffect,
                grainEffect + noiseB * grainIntensity * u_grainSaturation * 0.3
            );
        }

        return rgb + grainColor;
    }

    // Full Omega processing
    vec3 processOmega(vec3 rgb) {
        // Color matrix
        rgb = applyColorMatrix(rgb);

        // Push/Pull development
        rgb = applyPushPull(rgb);

        // H&D curve (film characteristic)
        float d_min = 0.15;
        float d_max = 2.20;
        float log_mid = u_filmLogMid + u_middleGray;

        float densR = hdCurve(rgb.r * u_hdCeilingR, d_min, d_max, u_hdGamma + u_hdGammaR, log_mid, u_hdShoulder);
        float densG = hdCurve(rgb.g * u_hdCeilingG, d_min, d_max, u_hdGamma + u_hdGammaG, log_mid, u_hdShoulder);
        float densB = hdCurve(rgb.b * u_hdCeilingB, d_min, d_max, u_hdGamma + u_hdGammaB, log_mid, u_hdShoulder);

        // Density to transmission
        rgb.r = pow(10.0, -(densR - d_min)) * u_hdRedMult;
        rgb.g = pow(10.0, -(densG - d_min)) * u_hdGreenMult;
        rgb.b = pow(10.0, -(densB - d_min)) * u_hdBlueMult;

        // Black offset
        rgb = rgb + vec3(u_hdBlack * 0.1);

        // Saturation
        rgb = applySaturation6Vec(rgb);

        // Skin
        rgb = applySkin(rgb);

        // Crosstalk
        if (abs(u_hdCrosstalk) > 0.001) {
            float avgRG = (rgb.r + rgb.g) * 0.5;
            rgb.r = mix(rgb.r, avgRG, u_hdCrosstalk * 0.3);
            rgb.g = mix(rgb.g, avgRG, u_hdCrosstalk * 0.3);
        }

        // Bleach bypass
        rgb = applyBleachBypass(rgb);

        // Contrast / tone mapping
        float pivot = 0.18;
        float contrastAmt = u_contrast / 1.0; // Normalize from slider 0-2 range
        rgb = vec3(
            piecewise(rgb.r - pivot, contrastAmt, pivot) + pivot,
            piecewise(rgb.g - pivot, contrastAmt, pivot) + pivot,
            piecewise(rgb.b - pivot, contrastAmt, pivot) + pivot
        );

        // White/black points
        rgb = (rgb - u_blackPoint) * (u_whitePoint / 9.0);
        rgb = rgb + u_blackOffset;

        // Print stock characteristics
        rgb = applyPrintStock(rgb);

        // Grain
        rgb = applyGrain(rgb);

        return clamp(rgb, 0.0, 1.0);
    }

    // ==================== HELIX PROCESSING ====================

    vec3 sampleRGB(vec2 uv) {
        return texture2D(u_image, clamp(uv, vec2(0.0), vec2(1.0))).rgb;
    }

    vec2 ring8(int i) {
        float angle = float(i) * 0.785398;
        return vec2(cos(angle), sin(angle));
    }

    vec2 ring8Offset(int i) {
        float angle = float(i) * 0.785398 + 0.392699;
        return vec2(cos(angle), sin(angle));
    }

    vec2 goldenSpiral(int i) {
        float angle = GOLDEN_ANGLE * float(i);
        return vec2(cos(angle), sin(angle));
    }

    vec3 processHelix(vec3 rgb, vec3 origRGB) {
        float origLum = luminance(origRGB);
        vec2 pixelSize = 1.0 / u_resolution;

        // Clarity
        if (u_clarityEnable > 0.5 && abs(u_clarityAmount) >= 0.5) {
            vec3 sumC = rgb * 4.0;
            float wtC = 4.0;
            float radius = 8.0 * u_scale;
            for (int i = 0; i < 8; i++) {
                vec2 offset = ring8(i) * radius * pixelSize;
                vec3 s = sampleRGB(v_texCoord + offset);
                float sampLum = luminance(s);
                if (sampLum >= 0.01) { sumC += s; wtC += 1.0; }
            }
            radius = 15.0 * u_scale;
            for (int i = 0; i < 8; i++) {
                vec2 offset = ring8Offset(i) * radius * pixelSize;
                vec3 s = sampleRGB(v_texCoord + offset);
                float sampLum = luminance(s);
                if (sampLum >= 0.01) { sumC += s; wtC += 1.0; }
            }
            vec3 blurC = sumC / wtC;
            vec3 detailC = rgb - blurC;
            float midDiff = origLum - 0.45;
            float midWeight = exp(-midDiff * midDiff * 8.0);
            float clarityGain = (u_clarityAmount / 50.0) * 0.8 * midWeight;
            rgb = clamp(rgb + detailC * clarityGain, 0.0, 1.0);
        }

        // Acutance
        if (u_microEnable > 0.5 && abs(u_microAmount) >= 0.5) {
            vec3 sumM = rgb * 5.0;
            float wtM = 5.0;
            float radius = 1.5 * u_scale;
            for (int i = 0; i < 8; i++) {
                vec2 offset = goldenSpiral(i) * radius * pixelSize;
                vec3 s = sampleRGB(v_texCoord + offset);
                float sampLum = luminance(s);
                if (sampLum >= 0.01) { sumM += s * 2.0; wtM += 2.0; }
            }
            radius = 3.0 * u_scale;
            for (int i = 8; i < 16; i++) {
                vec2 offset = goldenSpiral(i) * radius * pixelSize;
                vec3 s = sampleRGB(v_texCoord + offset);
                float sampLum = luminance(s);
                if (sampLum >= 0.01) { sumM += s; wtM += 1.0; }
            }
            vec3 blurM = sumM / wtM;
            float lumDetail = origLum - luminance(blurM);
            float hlFade = 1.0 - clamp((origLum - 0.7) / 0.25, 0.0, 1.0);
            hlFade = hlFade * hlFade * (3.0 - 2.0 * hlFade);
            float microGain = (u_microAmount / 50.0) * 2.5 * hlFade;
            rgb = clamp(rgb + lumDetail * microGain, 0.0, 1.0);
        }

        // Spatial EQ (simplified for performance)
        bool spatialActive = u_spatialEnable > 0.5 &&
            (u_z1 != 0.0 || u_z2 != 0.0 || u_z3 != 0.0 || u_z4 != 0.0 || u_z5 != 0.0 || u_z6 != 0.0);

        if (spatialActive) {
            vec3 sumS = rgb * 6.0;
            float wtS = 6.0;

            // Band 1: 2px
            float rad = 2.0 * u_scale;
            for (int i = 1; i <= 8; i++) {
                float rs = sqrt(float(i) / 8.0);
                vec2 offset = goldenSpiral(i) * rad * rs * pixelSize;
                vec3 s = sampleRGB(v_texCoord + offset);
                float sampLum = luminance(s);
                float lumWeight = clamp((sampLum - 0.01) / 0.03, 0.0, 1.0);
                float weight = (2.0 - float(i) / 8.0) * lumWeight;
                sumS += s * weight;
                wtS += weight;
            }
            vec3 blur1 = sumS / wtS;

            // Band 2: 6px
            rad = 6.0 * u_scale;
            for (int i = 9; i <= 16; i++) {
                float rs = sqrt(float(i - 8) / 8.0 + 0.3);
                vec2 offset = goldenSpiral(i) * rad * rs * pixelSize;
                vec3 s = sampleRGB(v_texCoord + offset);
                float sampLum = luminance(s);
                float lumWeight = clamp((sampLum - 0.01) / 0.03, 0.0, 1.0);
                sumS += s * lumWeight;
                wtS += lumWeight;
            }
            vec3 blur2 = sumS / wtS;

            // Band 3: 15px
            rad = 15.0 * u_scale;
            for (int i = 17; i <= 24; i++) {
                float rs = sqrt(float(i - 16) / 8.0 + 0.3);
                vec2 offset = goldenSpiral(i) * rad * rs * pixelSize;
                vec3 s = sampleRGB(v_texCoord + offset);
                float sampLum = luminance(s);
                float lumWeight = clamp((sampLum - 0.01) / 0.03, 0.0, 1.0);
                sumS += s * lumWeight;
                wtS += lumWeight;
            }
            vec3 blur3 = sumS / wtS;

            // Frequency bands
            vec3 b1 = rgb - blur1;
            vec3 b2 = blur1 - blur2;
            vec3 b3 = blur2 - blur3;

            // Reconstruct (simplified - using first 3 bands for performance)
            float g1 = 1.0 + u_z1 * 2.5;
            float g2 = 1.0 + u_z2 * 2.5;
            float g3 = 1.0 + u_z3 * 2.5;

            vec3 result = blur3 + b3 * g3 + b2 * g2 + b1 * g1;
            rgb = clamp(mix(rgb, result, u_spatialMix), 0.0, 1.0);
        }

        return rgb;
    }

    // ==================== MAIN ====================

    void main() {
        vec3 rgb = texture2D(u_image, v_texCoord).rgb;
        vec3 origRGB = rgb;

        // Input conversion (LogC3 to Linear)
        rgb = input_to_linear(rgb);

        // Gamut: AWG3 to AP1
        rgb = awg3_to_ap1(rgb);

        // Phi processing (shot-level grading)
        rgb = processPhi(rgb);

        // Omega processing (film emulation)
        if (u_omegaEnable > 0.5) {
            rgb = processOmega(rgb);
        }

        // Gamut: AP1 to output
        rgb = ap1_to_output(rgb);

        // Gamma encoding
        rgb = apply_gamma(rgb);

        // Helix processing (operates on display-referred)
        vec3 origForHelix = apply_gamma(ap1_to_output(processOmega(processPhi(awg3_to_ap1(input_to_linear(origRGB))))));
        rgb = processHelix(rgb, origForHelix);

        // Global mix
        vec3 bypass = apply_gamma(ap1_to_output(awg3_to_ap1(input_to_linear(origRGB))));
        rgb = mix(bypass, rgb, u_globalMix);

        gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), 1.0);
    }
`;

// Export for use
if (typeof window !== 'undefined') {
    window.OMEGA_VERTEX_SHADER = OMEGA_VERTEX_SHADER;
    window.OMEGA_FRAGMENT_SHADER = OMEGA_FRAGMENT_SHADER;
}
