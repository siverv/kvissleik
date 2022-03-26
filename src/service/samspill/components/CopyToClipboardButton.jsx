import { createSignal, onCleanup } from 'solid-js';

export function CopyToClipboardButton({children, getValue, ...props}){
  const [copied, setCopied] = createSignal(false);
  let timeoutId;
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(getValue());
    setCopied(true);
    timeoutId = setTimeout(() => setCopied(false), 5 * 1000);
  };
  onCleanup(() => {
    clearTimeout(timeoutId);
  });
  return <button class="copy-to-clipboard" type="button" onClick={copyToClipboard} {...props}>
    {copied() ? "copied!" : (children || "copy")}
  </button>
}