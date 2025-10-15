const fs = require('fs');
const path = require('path');

async function rimraf(dir) {
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    await Promise.all(entries.map(async entry => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await rimraf(full);
      } else {
        await fs.promises.unlink(full);
      }
    }));
    await fs.promises.rmdir(dir);
  } catch (e) {
    // ignore if not exists
  }
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const distDir = path.join(repoRoot, 'dist');
  await rimraf(distDir);
  console.log('dist/ cleaned');
}

main();
