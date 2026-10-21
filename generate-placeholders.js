// Generate placeholder PNG data URLs using canvas
const { createCanvas } = require('canvas');

const colors = {
  icaro: {r:62, g:174, b:106},    // green
  joao: {r:53, g:133, b:208},     // blue  
  maria: {r:217, g:87, b:87},      // red
  lara: {r:144, g:97, b:230}       // purple
};

const placeholders = {};

for (const [charId, rgb] of Object.entries(colors)) {
  const canvas = createCanvas(64, 64);
  const ctx = canvas.getContext('2d');
  
  // Background color block
  ctx.fillStyle = 'rgb(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ')';
  ctx.fillRect(0, 0, 64, 64);
  
  // Head
  ctx.fillStyle = 'rgba(255,228,196,0.9)'; // light skin
  ctx.beginPath();
  ctx.arc(32, 24, 10, 0, Math.PI * 2);
  ctx.fill();
  
  // Body
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(20, 34, 24, 30);
  
  // Feet
  ctx.fillStyle = 'rgb(58,47,40)';
  ctx.fillRect(22, 60, 4, 4);
  ctx.fillRect(34, 60, 4, 4);
  
  // Action dot
  ctx.fillStyle = 'rgb(0,0,0)';
  ctx.beginPath();
  ctx.arc(32, 50, 3, 0, Math.PI * 2);
  ctx.fill();
  
  const dataURL = canvas.toDataURL('image/png');
  placeholders[charId] = dataURL;
  console.log(charId + ':', dataURL.substring(0, 50) + '...');
}

console.log('Generated', Object.keys(placeholders).length, 'placeholders');

// Write a JS module with the placeholder data URLs
const output = `// Auto-generated placeholder sprites for Ilha Aurora characters\n`);
output += `export const PLACEHOLDER_SPRITES = {\n`;
for (const [charId, url] of Object.entries(placeholders)) {
  // Extract the base64 part
  const base64 = url.split(',')[1];
  output += `  ${charId}: '${base64}',\n`;
}
output += `};\n`;
output += `\n// Usage: PLACEHOLDER_SPRITES[charId]`;

require('fs').writeFileSync('placeholders.js', output);
console.log('Written to placeholders.js');