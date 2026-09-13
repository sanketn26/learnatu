import path from 'node:path';
import { routeForSourcePath } from './content-routes.mjs';

function walk(node, filePath) {
  if (node.type === 'paragraph' && node.children?.length === 1 && node.children[0].type === 'text') {
    const match = node.children[0].value.match(/^!!!\s+(\w+)\s+[“"]([^”"]+)[”"]\n([\s\S]+)$/);
    if (match) {
      const lines = match[3].split('\n').map((line) => line.trim()).filter(Boolean);
      node.type = 'blockquote';
      node.children = [
        { type: 'paragraph', children: [{ type: 'strong', children: [{ type: 'text', value: match[2] }] }] },
        { type: 'list', ordered: false, spread: false, children: lines.map((line) => ({ type: 'listItem', spread: false, children: [{ type: 'paragraph', children: [{ type: 'text', value: line.replace(/^-\s*/, '') }] }] })) }
      ];
    }
  }
  if (node.type === 'link' && typeof node.url === 'string') {
    const match = node.url.match(/^(.*?\.md)(#[^\s]*)?$/);
    if (match && filePath) {
      const target = path.resolve(path.dirname(filePath), match[1]);
      const locale = filePath.includes('/docs/hi/') ? 'hi' : 'en';
      const prefix = locale === 'hi' ? '/hi' : '';
      node.url = `${prefix}/${routeForSourcePath(target)}/${match[2] ?? ''}`;
    }
  }
  if (Array.isArray(node.children)) node.children.forEach((child) => walk(child, filePath));
}

export default function rewriteMarkdownLinks() {
  return (tree, file) => walk(tree, file.path);
}
