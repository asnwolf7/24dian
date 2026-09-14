/**
 * 静态编译校验：用 @vue/compiler-sfc 编译所有 .vue，捕获模板/脚本语法错误
 * 运行：node scripts/check-sfc.cjs
 */
const fs = require('fs');
const path = require('path');

let compiler;
try {
  compiler = require('vue/compiler-sfc');
} catch (e) {
  console.error('无法加载 vue/compiler-sfc，请先 pnpm install');
  process.exit(1);
}

const root = path.join(__dirname, '..', 'src');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.vue')) out.push(full);
  }
  return out;
}

const files = walk(root);
let failed = 0;

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = path.relative(path.join(__dirname, '..'), file);
  const { descriptor, errors } = compiler.parse(source, { filename: file });

  if (errors.length) {
    failed++;
    console.log(`✗ ${rel} 解析失败`);
    errors.forEach((e) => console.log(`    ${e.message}`));
    continue;
  }

  try {
    const id = 'check';
    if (descriptor.script || descriptor.scriptSetup) {
      compiler.compileScript(descriptor, { id, isProd: false });
    }
    compiler.compileTemplate({
      source: descriptor.template ? descriptor.template.content : '',
      filename: file,
      id,
    });
    console.log(`✓ ${rel}`);
  } catch (e) {
    failed++;
    console.log(`✗ ${rel} 编译失败`);
    console.log(`    ${e.message}`);
  }
}

console.log(`\n共检查 ${files.length} 个组件，失败 ${failed} 个`);
process.exit(failed > 0 ? 1 : 0);
