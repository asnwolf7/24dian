/**
 * 测试用 Vue 单文件组件加载器：把 .vue 即时编译成 ESM，供 node 直接渲染测试
 */
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parse, compileScript, compileTemplate } from 'vue/compiler-sfc';

export async function load(url, context, nextLoad) {
  if (url.includes('.vue?') || !url.endsWith('.vue')) {
    return nextLoad(url, context);
  }

  const filename = fileURLToPath(url);
  const source = await fs.readFile(filename, 'utf8');
  const { descriptor, errors } = parse(source, { filename });

  if (errors.length) {
    throw new Error(`${filename} 解析失败: ${errors[0].message}`);
  }

  const id = Buffer.from(filename).toString('hex').slice(0, 8);

  // 只有模板、没有 script 的组件（如 App.vue）
  if (!descriptor.script && !descriptor.scriptSetup) {
    const tpl = compileTemplate({
      source: descriptor.template ? descriptor.template.content : '',
      filename,
      id,
    });
    return {
      format: 'module',
      shortCircuit: true,
      source: `${tpl.code}\nexport default { render };\n`,
    };
  }

  const compiled = compileScript(descriptor, { id, inlineTemplate: true });

  return {
    format: 'module',
    shortCircuit: true,
    source: compiled.content,
  };
}
