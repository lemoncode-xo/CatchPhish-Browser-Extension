const fs = require('fs');
const path = require('path');

async function copyDir(src, dest) {
  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const publicDir = path.join(repoRoot, 'public');
  const distDir = path.join(repoRoot, 'dist');

  try {
    const stat = await fs.promises.stat(publicDir);
    if (!stat.isDirectory()) {
      console.log('No public/ directory found. Skipping copy.');
      return;
    }
  } catch (e) {
    console.log('No public/ directory found. Skipping copy.');
    return;
  }

  try {
    await copyDir(publicDir, distDir);
    console.log('Copied public/ -> dist/');
  } catch (err) {
    console.error('Failed to copy public -> dist:', err);
    process.exitCode = 1;
  }
}

main();
