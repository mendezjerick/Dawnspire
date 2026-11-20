/** Public-folder paths resolved against the deploy base (e.g. /Dawnspire/ on GitHub Pages, / on dawnspire.cc). */
export const asset = (path: string) => (path.startsWith('/') && !path.startsWith('//') ? import.meta.env.BASE_URL + path.slice(1) : path);
