// src/ altındaki dosyaları tek parça dist/okey101.html dosyasına birleştirir (Publish için tek dosya gerekir).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const jsDir = path.join(root, 'src/js');
const js = fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(jsDir, f), 'utf8')).join('');
const html = read('src/index.html')
  .replace('<!--@STYLE-->\n', () => read('src/styles.css'))
  .replace('<!--@SCRIPT-->\n', () => js);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/okey101.html'), html);
fs.writeFileSync(path.join(root, 'dist/index.html'), html);   // Vercel vb. statik barındırma için kök sayfa
console.log('dist/okey101.html yazıldı (' + html.length + ' karakter)');
