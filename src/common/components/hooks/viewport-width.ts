/** The width the page actually gets: excludes the vertical scrollbar, unlike `window.innerWidth`. */
const viewportWidth = (): number => document.documentElement.clientWidth || window.innerWidth;

export default viewportWidth;
