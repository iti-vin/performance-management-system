/** Opens a page as a new document: the browser drops everything of the page before. */
export function loadPage(path: string): void {
  window.location.replace(path);
}
