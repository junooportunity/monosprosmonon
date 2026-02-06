// Omega Film Stock Presets - WebGL Port
// Extracted from OmegaCore.h and stock_presets.metal.inc

const OMEGA_NEGATIVE_STOCKS = {
    0: { name: "Kodak Vision3 50D 5203", filmLogMid: -0.825, hdGamma: 0.819, hlCompress: 0.616, printerR: 26.50, printerG: 25.00, printerB: 24.32 },
    1: { name: "Kodak Vision3 250D 5207", filmLogMid: -0.825, hdGamma: 0.819, hlCompress: 0.616, printerR: 26.50, printerG: 25.00, printerB: 24.50 },
    2: { name: "Kodak Vision3 200T 5213", filmLogMid: -0.825, hdGamma: 0.819, hlCompress: 0.616, printerR: 27.00, printerG: 25.00, printerB: 24.50 },
    3: { name: "Kodak Vision3 500T 5219", filmLogMid: -0.825, hdGamma: 0.819, hlCompress: 0.616, printerR: 27.25, printerG: 25.40, printerB: 24.50 },
    4: { name: "Kodak ECN-I 5247", filmLogMid: -0.975, hdGamma: 0.963, hlCompress: 0.616, printerR: 25.39, printerG: 25.39, printerB: 24.50 },
    5: { name: "Kodak ECN-I 5248", filmLogMid: -0.975, hdGamma: 0.963, hlCompress: 0.616, printerR: 25.39, printerG: 25.39, printerB: 24.50 },
    6: { name: "Kodak ECN-II 5247", filmLogMid: -0.975, hdGamma: 0.963, hlCompress: 0.616, printerR: 27.75, printerG: 25.00, printerB: 24.32 },
    7: { name: "Kodak ECN-II 5250 50D", filmLogMid: -0.975, hdGamma: 0.963, hlCompress: 0.616, printerR: 27.75, printerG: 25.00, printerB: 24.32 },
    8: { name: "Kodak ECN-II 5277 400T", filmLogMid: -0.975, hdGamma: 0.963, hlCompress: 0.616, printerR: 27.75, printerG: 25.00, printerB: 24.32 },
    9: { name: "Kodak EXR 5293 200T", filmLogMid: -0.845, hdGamma: 0.810, hlCompress: 0.721, printerR: 26.25, printerG: 22.83, printerB: 23.30 },
    10: { name: "Kodak EXR 5248 100T", filmLogMid: -0.819, hdGamma: 0.810, hlCompress: 0.721, printerR: 26.25, printerG: 22.83, printerB: 23.30 },
    11: { name: "Kodak Double-X 5222", filmLogMid: -0.681, hdGamma: 0.945, hlCompress: 0.537, printerR: 27.75, printerG: 25.00, printerB: 24.32, bw: true },
    12: { name: "Kodak Portra 160", filmLogMid: -0.773, hdGamma: 0.937, hlCompress: 0.694, printerR: 29.00, printerG: 25.40, printerB: 24.10 },
    13: { name: "Kodak Portra 400", filmLogMid: -0.871, hdGamma: 0.937, hlCompress: 0.694, printerR: 29.00, printerG: 25.40, printerB: 24.10 },
    14: { name: "Kodak Portra 800", filmLogMid: -0.924, hdGamma: 0.941, hlCompress: 0.694, printerR: 29.00, printerG: 25.40, printerB: 24.10 },
    15: { name: "Kodak Ektar 100", filmLogMid: -0.753, hdGamma: 0.592, hlCompress: 0.891, printerR: 27.00, printerG: 25.00, printerB: 24.50 },
    16: { name: "Kodak Gold 200", filmLogMid: -0.800, hdGamma: 0.850, hlCompress: 0.700, printerR: 28.00, printerG: 25.50, printerB: 24.00 },
    17: { name: "Kodak Ultramax 400", filmLogMid: -0.850, hdGamma: 0.880, hlCompress: 0.720, printerR: 28.50, printerG: 26.00, printerB: 24.00 },
    18: { name: "Kodak Vericolor III", filmLogMid: -0.780, hdGamma: 0.900, hlCompress: 0.650, printerR: 27.00, printerG: 25.00, printerB: 24.50 },
    19: { name: "Kodak Aerocolor IV", filmLogMid: -0.800, hdGamma: 0.850, hlCompress: 0.700, printerR: 27.00, printerG: 25.00, printerB: 24.50 },
    20: { name: "Kodachrome 64", filmLogMid: -0.700, hdGamma: 0.750, hlCompress: 0.800, printerR: 28.00, printerG: 25.00, printerB: 24.00 },
    21: { name: "Ektachrome E100", filmLogMid: -0.750, hdGamma: 0.800, hlCompress: 0.750, printerR: 27.00, printerG: 25.00, printerB: 25.00 },
    22: { name: "Ektachrome 100D", filmLogMid: -0.750, hdGamma: 0.800, hlCompress: 0.750, printerR: 27.00, printerG: 25.00, printerB: 24.80 },
    23: { name: "Kodak Tri-X 400", filmLogMid: -0.850, hdGamma: 0.900, hlCompress: 0.600, printerR: 27.00, printerG: 25.00, printerB: 24.50, bw: true },
    24: { name: "Kodak Plus-X 125", filmLogMid: -0.750, hdGamma: 0.850, hlCompress: 0.650, printerR: 27.00, printerG: 25.00, printerB: 24.50, bw: true },
    25: { name: "Fuji Eterna 500T", filmLogMid: -0.830, hdGamma: 0.820, hlCompress: 0.620, printerR: 26.50, printerG: 25.00, printerB: 25.00 },
    26: { name: "Fuji Eterna 500T Vivid", filmLogMid: -0.830, hdGamma: 0.820, hlCompress: 0.620, printerR: 26.50, printerG: 25.00, printerB: 24.50 },
    27: { name: "Fuji Pro 400H", filmLogMid: -0.870, hdGamma: 0.920, hlCompress: 0.680, printerR: 28.00, printerG: 25.50, printerB: 24.50 },
    28: { name: "Fuji Pro 160C", filmLogMid: -0.780, hdGamma: 0.900, hlCompress: 0.700, printerR: 27.50, printerG: 25.20, printerB: 24.80 },
    29: { name: "Fuji Pro 160S", filmLogMid: -0.780, hdGamma: 0.900, hlCompress: 0.700, printerR: 27.50, printerG: 25.20, printerB: 24.50 },
    30: { name: "Fuji Superia 400", filmLogMid: -0.860, hdGamma: 0.880, hlCompress: 0.700, printerR: 28.00, printerG: 25.80, printerB: 24.20 },
    31: { name: "Fuji Velvia 50", filmLogMid: -0.700, hdGamma: 0.650, hlCompress: 0.850, printerR: 27.00, printerG: 24.50, printerB: 25.00 },
    32: { name: "Fuji Velvia 100", filmLogMid: -0.720, hdGamma: 0.680, hlCompress: 0.830, printerR: 27.00, printerG: 24.50, printerB: 25.00 },
    33: { name: "Fuji Provia 100F", filmLogMid: -0.750, hdGamma: 0.780, hlCompress: 0.770, printerR: 27.00, printerG: 25.00, printerB: 25.00 },
    34: { name: "Fuji Astia 100F", filmLogMid: -0.750, hdGamma: 0.800, hlCompress: 0.750, printerR: 27.00, printerG: 25.00, printerB: 24.80 },
    35: { name: "Fuji Neopan 100", filmLogMid: -0.750, hdGamma: 0.850, hlCompress: 0.700, printerR: 27.00, printerG: 25.00, printerB: 24.50, bw: true },
    36: { name: "Fuji Neopan 400", filmLogMid: -0.850, hdGamma: 0.880, hlCompress: 0.680, printerR: 27.00, printerG: 25.00, printerB: 24.50, bw: true },
    37: { name: "Agfa Vista 200", filmLogMid: -0.800, hdGamma: 0.860, hlCompress: 0.710, printerR: 27.50, printerG: 25.50, printerB: 24.00 },
    38: { name: "Agfa Vista 400", filmLogMid: -0.860, hdGamma: 0.880, hlCompress: 0.700, printerR: 28.00, printerG: 25.80, printerB: 24.00 },
    39: { name: "CineStill 800T", filmLogMid: -0.900, hdGamma: 0.850, hlCompress: 0.650, printerR: 27.50, printerG: 25.50, printerB: 25.50 },
    40: { name: "CineStill 50D", filmLogMid: -0.780, hdGamma: 0.820, hlCompress: 0.700, printerR: 26.50, printerG: 25.00, printerB: 24.50 },
    41: { name: "Lomography 400", filmLogMid: -0.880, hdGamma: 0.900, hlCompress: 0.680, printerR: 28.50, printerG: 26.00, printerB: 23.50 }
};

// Common Omega parameters (from DCTL defaults)
const OMEGA_DEFAULTS = {
    // Color matrix
    mtx_rR: 1.0, mtx_gR: 0.0, mtx_bR: 0.0,
    mtx_rG: 0.153, mtx_gG: 1.0, mtx_bG: 0.083,
    mtx_rB: 0.044, mtx_gB: 0.249, mtx_bB: 1.0,
    mtx_presNeut: true,

    // H&D curve
    hdCeilingR: 1.030, hdCeilingG: 0.996, hdCeilingB: 1.010,
    hdShoulder: 0.050,
    hdRedMult: 1.034, hdGreenMult: 1.000, hdBlueMult: 0.906,
    hdGamma: 0.503,
    hdGammaR: -0.004, hdGammaG: 0.0, hdGammaB: 0.0,
    middleGray: -0.982,
    hdCrosstalk: 0.0,
    hdBlack: 0.200,

    // Saturation (6-vector)
    desat_global: -0.258,
    desat_red: -0.197,
    desat_green: -1.0,
    desat_blue: -0.939,
    desat_cyan: -0.336,
    desat_magenta: -0.258,
    desat_yellow: -0.214,

    // Skin
    skinMelanin: 0.0,
    skinHemoglobin: 0.118,
    skinRichness: 0.371,
    skinDensity: 0.170,

    // Tone mapping
    contrast: 6.03,
    whitePoint: 1.034,
    blackOffset: 0.045,
    blackPoint: -0.022
};

// Print stock characteristics
const OMEGA_PRINT_STOCKS = {
    1: { name: "Kodak Vision 2383", contrast: 1.0, warmth: 0.0, saturation: 1.0 },
    2: { name: "Kodak Vision Premier 2393", contrast: 1.05, warmth: 0.02, saturation: 1.02 },
    3: { name: "Kodak Dye Transfer", contrast: 1.15, warmth: 0.05, saturation: 1.10 },
    4: { name: "Kodak ECP 5381", contrast: 0.95, warmth: -0.02, saturation: 0.98 },
    5: { name: "Kodak Intermediate 5383", contrast: 0.90, warmth: 0.0, saturation: 0.95 },
    6: { name: "Kodak ECP 5384", contrast: 1.0, warmth: 0.01, saturation: 1.0 },
    7: { name: "Kodak EXR 5386", contrast: 1.02, warmth: 0.0, saturation: 1.0 },
    8: { name: "Kodak Duraflex Plus", contrast: 1.0, warmth: 0.02, saturation: 1.02 },
    9: { name: "Kodak Endura Premier", contrast: 1.05, warmth: 0.03, saturation: 1.05 },
    10: { name: "Kodak Portra Endura", contrast: 0.98, warmth: 0.02, saturation: 0.95 },
    11: { name: "Kodak Supra Endura", contrast: 1.02, warmth: 0.01, saturation: 1.02 },
    12: { name: "Fuji Eterna-RDI 3513DI", contrast: 1.0, warmth: -0.02, saturation: 1.0 },
    13: { name: "Fujiflex SFA3", contrast: 1.08, warmth: 0.0, saturation: 1.05 },
    14: { name: "Fuji Crystal Archive Super C", contrast: 1.05, warmth: 0.01, saturation: 1.08 },
    15: { name: "Fuji Crystal Archive DP II", contrast: 1.02, warmth: 0.0, saturation: 1.02 },
    16: { name: "Fuji Crystal Archive Maxima", contrast: 1.08, warmth: 0.02, saturation: 1.10 },
    17: { name: "Fujiflex Crystal", contrast: 1.10, warmth: 0.0, saturation: 1.08 },
    18: { name: "Fuji Crystal Archive Pro PD II", contrast: 1.0, warmth: 0.0, saturation: 1.0 },
    19: { name: "Technicolor V", contrast: 1.20, warmth: 0.08, saturation: 1.25 }
};

// Output color spaces (matrices from AP1)
const OMEGA_OUTPUT_SPACES = {
    0: { name: "Rec.709 / sRGB", gamma: 2.4 },
    1: { name: "Rec.709 (2.2)", gamma: 2.2 },
    2: { name: "P3-D65", gamma: 2.6 },
    3: { name: "P3-DCI", gamma: 2.6 },
    4: { name: "Rec.2020", gamma: 2.4 },
    5: { name: "P3-D65 (Display)", gamma: 2.2 }
};

// Input color spaces
const OMEGA_INPUT_SPACES = {
    0: "LogC3 (ARRI)",
    1: "LogC4 (ARRI)",
    2: "DaVinci Intermediate",
    3: "ACEScct",
    4: "S-Log3",
    5: "Log3G10 (RED)",
    6: "Linear"
};

// Export for use
if (typeof window !== 'undefined') {
    window.OMEGA_NEGATIVE_STOCKS = OMEGA_NEGATIVE_STOCKS;
    window.OMEGA_DEFAULTS = OMEGA_DEFAULTS;
    window.OMEGA_PRINT_STOCKS = OMEGA_PRINT_STOCKS;
    window.OMEGA_OUTPUT_SPACES = OMEGA_OUTPUT_SPACES;
    window.OMEGA_INPUT_SPACES = OMEGA_INPUT_SPACES;
}
