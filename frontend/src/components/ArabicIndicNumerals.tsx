import { useLayoutEffect } from 'react';
import { formatArabicIndicNumerals } from '@/utils/arabicNumerals';

const EXCLUDED_SELECTOR = [
  'input',
  'textarea',
  'select',
  'option',
  'button[data-preserve-western-numerals]',
  'a[href]',
  'pre',
  'code',
  'kbd',
  'samp',
  'script',
  'style',
  '[contenteditable="true"]',
  '[data-preserve-western-numerals]',
].join(', ');

const FILE_NAME_PATTERN = /(?:^|\s)[^\s/\\]+\.(?:pdf|docx?|xlsx?|csv|pptx?|png|jpe?g|svg|mp3|mp4|webm|zip)(?=$|\s)/i;
const URL_PATTERN = /^(?:https?:\/\/|www\.|\/(?:api|tool|category|files)(?:\/|$))/i;

function shouldPreserve(node: Text): boolean {
  const parent = node.parentElement;
  const text = node.nodeValue ?? '';

  return !parent
    || Boolean(parent.closest(EXCLUDED_SELECTOR))
    || FILE_NAME_PATTERN.test(text)
    || URL_PATTERN.test(text.trim());
}

function formatTextNode(node: Text) {
  if (shouldPreserve(node)) return;

  const formatted = formatArabicIndicNumerals(node.nodeValue ?? '');
  if (formatted !== node.nodeValue) node.nodeValue = formatted;
}

function formatSubtree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    formatTextNode(root as Text);
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    formatTextNode(node as Text);
    node = walker.nextNode();
  }
}

/** Applies Arabic-Indic numerals to rendered application text only. */
export function ArabicIndicNumerals() {
  useLayoutEffect(() => {
    formatSubtree(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          formatTextNode(mutation.target as Text);
          continue;
        }

        mutation.addedNodes.forEach(formatSubtree);
      }
    });

    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
