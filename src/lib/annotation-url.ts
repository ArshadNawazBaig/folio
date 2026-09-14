/** PDF links may open a website or an email composer, never execute a script or local file. */
export function annotationUrl(value: string): string {
  const input = value.trim();
  if (
    !input ||
    input.length > 2048 ||
    [...input].some((char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127)
  )
    throw new Error('Enter a valid website or mailto: address for each link, or remove the link.');
  const url = new URL(input);
  if (
    !['https:', 'http:', 'mailto:'].includes(url.protocol) ||
    (url.protocol === 'mailto:' && !url.pathname.includes('@')) ||
    url.username ||
    url.password
  )
    throw new Error(
      'Links must use https://, http://, or mailto: addresses without embedded credentials.',
    );
  return url.href;
}
