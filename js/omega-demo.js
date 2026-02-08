// Omega Demo - Pre-rendered Images
// Full matrix: 42 Negative × 19 Print × 10 Dye × 4 Variants = 31,920 images
// Image naming: neg_XX_print_YY_dye_ZZ_variant.webp

(function() {
    'use strict';

    const CDN_BASE = 'https://pub-adc2c26304504e67aa77e3dedd9dc84e.r2.dev';

    // Elements
    const demoImage = document.getElementById('omega-demo-image');

    // Omega Controls
    const negativeSelect = document.getElementById('negative-select');
    const dyeSelect = document.getElementById('dye-select');
    const printSelect = document.getElementById('print-select');
    const grainCheck = document.getElementById('grain-check');
    const halationCheck = document.getElementById('halation-check');

    if (!demoImage) {
        console.error('Omega demo: missing omega-demo-image element');
        return;
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
        demoImage.src = url;
    }

    // Omega controls - change image
    negativeSelect?.addEventListener('change', updateImage);
    dyeSelect?.addEventListener('change', updateImage);
    printSelect?.addEventListener('change', updateImage);
    grainCheck?.addEventListener('change', updateImage);
    halationCheck?.addEventListener('change', updateImage);

    // Initial load
    updateImage();

})();
