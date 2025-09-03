#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Build configuration
const config = {
  sourceDir: './public',
  buildDir: './dist',
  cssFiles: [
    'css/base.css',
    'css/components.css',
    'css/layout.css',
    'css/utilities.css'
  ],
  jsFiles: [
    'js/image-optimizer.js',
    'js/performance-monitor.js',
    'script.js',
    'admin.js',
    'admin-utils.js'
  ],
  htmlFiles: [
    'index.html',
    'admin.html',
    'admin-login.html'
  ]
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step) {
  log(`\n${colors.cyan}${colors.bright}${step}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

// Utility functions
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  ensureDir(destDir);
  fs.copyFileSync(src, dest);
}

function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/\s*([{}:;,])\s*/g, '$1') // Remove spaces around brackets, colons, semicolons, commas
    .replace(/;\s*}/g, '}') // Remove semicolons before closing braces
    .replace(/:\s*0px/g, ':0') // Remove px from 0 values
    .replace(/:\s*0em/g, ':0') // Remove em from 0 values
    .replace(/:\s*0%/g, ':0') // Remove % from 0 values
    .trim();
}

function minifyJS(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, '') // Remove line comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/\s*([{}:;,])\s*/g, '$1') // Remove spaces around brackets, colons, semicolons, commas
    .replace(/;\s*}/g, '}') // Remove semicolons before closing braces
    .trim();
}

function minifyHTML(html) {
  return html
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/>\s+</g, '><') // Remove spaces between tags
    .replace(/\s*([{}:;,])\s*/g, '$1') // Remove spaces around brackets, colons, semicolons, commas
    .trim();
}

// Build functions
function cleanBuildDir() {
  logStep('Cleaning build directory...');
  
  if (fs.existsSync(config.buildDir)) {
    fs.rmSync(config.buildDir, { recursive: true, force: true });
  }
  ensureDir(config.buildDir);
  
  logSuccess('Build directory cleaned');
}

function copyStaticAssets() {
  logStep('Copying static assets...');
  
  // Copy all files from source to build
  function copyRecursive(src, dest) {
    const stats = fs.statSync(src);
    
    if (stats.isDirectory()) {
      ensureDir(dest);
      const files = fs.readdirSync(src);
      files.forEach(file => {
        copyRecursive(path.join(src, file), path.join(dest, file));
      });
    } else {
      copyFile(src, dest);
    }
  }
  
  copyRecursive(config.sourceDir, config.buildDir);
  logSuccess('Static assets copied');
}

function optimizeCSS() {
  logStep('Optimizing CSS files...');
  
  config.cssFiles.forEach(cssFile => {
    const srcPath = path.join(config.sourceDir, cssFile);
    const destPath = path.join(config.buildDir, cssFile);
    
    if (fs.existsSync(srcPath)) {
      const css = fs.readFileSync(srcPath, 'utf8');
      const minified = minifyCSS(css);
      
      // Create .min.css version
      const minPath = destPath.replace('.css', '.min.css');
      const minDir = path.dirname(minPath);
      ensureDir(minDir);
      fs.writeFileSync(minPath, minified);
      
      logSuccess(`CSS optimized: ${cssFile} -> ${path.relative(config.buildDir, minPath)}`);
    }
  });
}

function optimizeJS() {
  logStep('Optimizing JavaScript files...');
  
  config.jsFiles.forEach(jsFile => {
    const srcPath = path.join(config.sourceDir, jsFile);
    const destPath = path.join(config.buildDir, jsFile);
    
    if (fs.existsSync(srcPath)) {
      const js = fs.readFileSync(srcPath, 'utf8');
      const minified = minifyJS(js);
      
      // Create .min.js version
      const minPath = destPath.replace('.js', '.min.js');
      const minDir = path.dirname(minPath);
      ensureDir(minDir);
      fs.writeFileSync(minPath, minified);
      
      logSuccess(`JavaScript optimized: ${jsFile} -> ${path.relative(config.buildDir, minPath)}`);
    }
  });
}

function optimizeHTML() {
  logStep('Optimizing HTML files...');
  
  config.htmlFiles.forEach(htmlFile => {
    const srcPath = path.join(config.sourceDir, htmlFile);
    const destPath = path.join(config.buildDir, htmlFile);
    
    if (fs.existsSync(srcPath)) {
      const html = fs.readFileSync(srcPath, 'utf8');
      const minified = minifyHTML(html);
      
      // Create .min.html version
      const minPath = destPath.replace('.html', '.min.html');
      const minDir = path.dirname(minPath);
      ensureDir(minDir);
      fs.writeFileSync(minPath, minified);
      
      logSuccess(`HTML optimized: ${htmlFile} -> ${path.relative(config.buildDir, minPath)}`);
    }
  });
}

function createBundleCSS() {
  logStep('Creating bundled CSS...');
  
  let bundleCSS = '';
  
  config.cssFiles.forEach(cssFile => {
    const srcPath = path.join(config.sourceDir, cssFile);
    if (fs.existsSync(srcPath)) {
      const css = fs.readFileSync(srcPath, 'utf8');
      bundleCSS += `/* ${cssFile} */\n${css}\n\n`;
    }
  });
  
  const bundlePath = path.join(config.buildDir, 'css', 'bundle.css');
  const minBundlePath = path.join(config.buildDir, 'css', 'bundle.min.css');
  
  ensureDir(path.dirname(bundlePath));
  fs.writeFileSync(bundlePath, bundleCSS);
  fs.writeFileSync(minBundlePath, minifyCSS(bundleCSS));
  
  logSuccess('CSS bundle created');
}

function createBundleJS() {
  logStep('Creating bundled JavaScript...');
  
  let bundleJS = '';
  
  config.jsFiles.forEach(jsFile => {
    const srcPath = path.join(config.sourceDir, jsFile);
    if (fs.existsSync(srcPath)) {
      const js = fs.readFileSync(srcPath, 'utf8');
      bundleJS += `/* ${jsFile} */\n${js}\n\n`;
    }
  });
  
  const bundlePath = path.join(config.buildDir, 'js', 'bundle.js');
  const minBundlePath = path.join(config.buildDir, 'js', 'bundle.min.js');
  
  ensureDir(path.dirname(bundlePath));
  fs.writeFileSync(bundlePath, bundleJS);
  fs.writeFileSync(minBundlePath, minifyJS(bundleJS));
  
  logSuccess('JavaScript bundle created');
}

function generateManifest() {
  logStep('Generating build manifest...');
  
  const manifest = {
    buildTime: new Date().toISOString(),
    version: '2.0.0',
    files: {
      css: config.cssFiles.map(file => ({
        original: file,
        minified: file.replace('.css', '.min.css'),
        bundle: 'css/bundle.css',
        minBundle: 'css/bundle.min.css'
      })),
      js: config.jsFiles.map(file => ({
        original: file,
        minified: file.replace('.js', '.min.js'),
        bundle: 'js/bundle.js',
        minBundle: 'js/bundle.min.js'
      })),
      html: config.htmlFiles.map(file => ({
        original: file,
        minified: file.replace('.html', '.min.html')
      }))
    }
  };
  
  const manifestPath = path.join(config.buildDir, 'build-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  logSuccess('Build manifest generated');
}

function generateReport() {
  logStep('Generating build report...');
  
  const buildDir = config.buildDir;
  const report = {
    timestamp: new Date().toISOString(),
    buildSize: getDirectorySize(buildDir),
    fileCount: countFiles(buildDir),
    optimization: {
      css: {
        original: getTotalSize(config.cssFiles.map(f => path.join(config.sourceDir, f))),
        minified: getTotalSize(config.cssFiles.map(f => path.join(buildDir, f.replace('.css', '.min.css')))),
        bundle: fs.existsSync(path.join(buildDir, 'css/bundle.min.css')) ? 
          fs.statSync(path.join(buildDir, 'css/bundle.min.css')).size : 0
      },
      js: {
        original: getTotalSize(config.jsFiles.map(f => path.join(config.sourceDir, f))),
        minified: getTotalSize(config.jsFiles.map(f => path.join(buildDir, f.replace('.js', '.min.js')))),
        bundle: fs.existsSync(path.join(buildDir, 'js/bundle.min.js')) ? 
          fs.statSync(path.join(buildDir, 'js/bundle.min.js')).size : 0
      }
    }
  };
  
  const reportPath = path.join(buildDir, 'build-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  logSuccess('Build report generated');
  
  // Display summary
  log('\n📊 Build Summary:', 'cyan');
  log(`Total build size: ${formatBytes(report.buildSize)}`, 'green');
  log(`Files processed: ${report.fileCount}`, 'green');
  log(`CSS optimization: ${formatBytes(report.optimization.css.original)} → ${formatBytes(report.optimization.css.minified)}`, 'yellow');
  log(`JS optimization: ${formatBytes(report.optimization.js.original)} → ${formatBytes(report.optimization.js.minified)}`, 'yellow');
}

function getDirectorySize(dir) {
  let size = 0;
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      size += getDirectorySize(filePath);
    } else {
      size += stats.size;
    }
  });
  
  return size;
}

function countFiles(dir) {
  let count = 0;
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      count += countFiles(filePath);
    } else {
      count++;
    }
  });
  
  return count;
}

function getTotalSize(files) {
  return files.reduce((total, file) => {
    if (fs.existsSync(file)) {
      return total + fs.statSync(file).size;
    }
    return total;
  }, 0);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Main build function
async function build() {
  try {
    log('🚀 Starting build process...', 'bright');
    
    cleanBuildDir();
    copyStaticAssets();
    optimizeCSS();
    optimizeJS();
    optimizeHTML();
    createBundleCSS();
    createBundleJS();
    generateManifest();
    generateReport();
    
    log('\n🎉 Build completed successfully!', 'green');
    log(`Build output: ${config.buildDir}`, 'cyan');
    
  } catch (error) {
    logError(`Build failed: ${error.message}`);
    process.exit(1);
  }
}

// Run build if called directly
if (require.main === module) {
  build();
}

module.exports = { build, config };
