// Node.js script to create PWA icons
// Run with: node create-icons.js

const fs = require('fs');
const { createCanvas } = require('canvas');

function createIcon(size, isMaskable, filename) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background - gradient from green to emerald
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#10b981');
    gradient.addColorStop(1, '#059669');
    ctx.fillStyle = gradient;

    if (isMaskable) {
        ctx.fillRect(0, 0, size, size);
    } else {
        roundRect(ctx, 0, 0, size, size, size * 0.15);
        ctx.fill();
    }

    // Icon design - weight scale
    ctx.strokeStyle = 'white';
    ctx.fillStyle = 'white';
    ctx.lineWidth = size * 0.04;

    const centerX = size / 2;
    const centerY = size / 2;
    const plateRadius = size * 0.28;

    // Main circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, plateRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Segments
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        const x1 = centerX + Math.cos(angle) * plateRadius * 0.7;
        const y1 = centerY + Math.sin(angle) * plateRadius * 0.7;
        const x2 = centerX + Math.cos(angle) * plateRadius * 0.9;
        const y2 = centerY + Math.sin(angle) * plateRadius * 0.9;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    // Center dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, size * 0.04, 0, Math.PI * 2);
    ctx.fill();

    // Leafs
    drawLeaf(ctx, centerX - plateRadius * 0.4, centerY - plateRadius * 0.6, size * 0.12, -30);
    drawLeaf(ctx, centerX + plateRadius * 0.3, centerY - plateRadius * 0.6, size * 0.1, 20);

    // Save to file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filename, buffer);
    console.log(`✓ Created ${filename}`);
}

function drawLeaf(ctx, x, y, size, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation * Math.PI / 180);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.3, -size * 0.5, size * 0.5, -size);
    ctx.quadraticCurveTo(size * 0.3, -size * 0.6, 0, 0);
    ctx.fill();

    ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

try {
    createIcon(192, false, 'icon-192.png');
    createIcon(512, false, 'icon-512.png');
    createIcon(192, true, 'icon-maskable-192.png');
    createIcon(512, true, 'icon-maskable-512.png');
    console.log('\n✅ All icons created successfully!');
} catch (error) {
    console.error('Error: This script requires the "canvas" package.');
    console.error('Install it with: npm install canvas');
    console.error('\nAlternatively, open generate-icons.html in a browser and download the icons manually.');
}
