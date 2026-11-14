// Single-colour instrument silhouettes. They draw in `currentColor`, so the
// "off" state is a single CSS colour change.

const svg = (body) =>
  `<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false">${body}</svg>`;

const hole = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;

export const ICONS = {
  fiddle: svg(`
    <path fill="currentColor" fill-rule="evenodd" d="M30.5 6h3v18h-3z M32 2.5a3 3 0 1 1 0 6a3 3 0 1 1 0-6z
      M32 22c-7 0-11 3-11 8 0 3 2 5 2 7s-3 4-3 9c0 6 5 10 12 10s12-4 12-10c0-5-3-7-3-9s2-4 2-7c0-5-4-8-11-8z
      M27 36h2v9h-2z M35 36h2v9h-2z"/>
    <path d="M10 58 L56 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`),

  flute: svg(`
    <g transform="rotate(-30 32 32)">
      <path fill="currentColor" fill-rule="evenodd" d="M4 28h56a4 4 0 0 1 0 8H4a4 4 0 0 1 0-8z
        ${hole(11, 32, 2)} ${hole(26, 32, 1.6)} ${hole(32, 32, 1.6)} ${hole(38, 32, 1.6)}
        ${hole(46, 32, 1.6)} ${hole(52, 32, 1.6)}"/>
    </g>`),

  piano: svg(`
    <rect x="5" y="14" width="54" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="3"/>
    <path stroke="currentColor" stroke-width="2" d="M16 14v36M26.5 14v36M37.5 14v36M48 14v36"/>
    <path fill="currentColor" d="M12.5 14h7v20h-7z M23 14h7v20h-7z M44.5 14h7v20h-7z"/>`),

  guitar: svg(`
    <path fill="currentColor" fill-rule="evenodd" d="M30 4h4v26h-4z M28 2h8v6h-8z
      M32 24c-6 0-9 3.5-9 7.5 0 2.5 1.5 4 1.5 5.5S20 40 20 47c0 7 5.5 12 12 12s12-5 12-12c0-7-4.5-8.5-4.5-10s1.5-3 1.5-5.5C41 27.5 38 24 32 24z
      ${hole(32, 41, 4)}"/>`),

  banjo: svg(`
    <path fill="currentColor" d="M30 3h4v30h-4z M27 2h10v6H27z M24 20h4v3h-4z"/>
    <circle cx="32" cy="44" r="15" fill="none" stroke="currentColor" stroke-width="4"/>
    <circle cx="32" cy="44" r="9" fill="currentColor" opacity="0.45"/>
    <path stroke="currentColor" stroke-width="2.5" d="M32 29v30"/>`),

  bass: svg(`
    <path fill="currentColor" fill-rule="evenodd" d="M30.5 2h3v18h-3z M28.5 1h7v4h-7z
      M32 17c-8 0-12 3-12 9 0 4 2.5 6 2.5 8.5S18 39 18 46c0 8 6 13 14 13s14-5 14-13c0-7-4.5-9-4.5-11.5S44 30 44 26c0-6-4-9-12-9z
      M26.5 34h2v11h-2z M35.5 34h2v11h-2z"/>
    <path d="M32 58v5" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`),

  bodhran: svg(`
    <circle cx="28" cy="34" r="20" fill="none" stroke="currentColor" stroke-width="5"/>
    <path stroke="currentColor" stroke-width="2.5" d="M12 34h32M28 18v32" opacity="0.6"/>
    <path d="M42 56 L60 8" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="42" cy="56" r="3.5" fill="currentColor"/><circle cx="60" cy="8" r="3.5" fill="currentColor"/>`),

  feet: svg(`
    <path fill="currentColor" d="M26 22c7 0 11 6 11 14 0 10-3 24-11 24-6 0-8-6-8-14 0-12 2-24 8-24z"/>
    <circle cx="20" cy="15" r="3.4" fill="currentColor"/><circle cx="26.5" cy="11.5" r="3.2" fill="currentColor"/>
    <circle cx="33" cy="12" r="2.8" fill="currentColor"/><circle cx="38" cy="15.5" r="2.4" fill="currentColor"/>
    <circle cx="41" cy="20.5" r="2" fill="currentColor"/>
    <path d="M46 40l6-4M47 47h7M46 54l6 4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`),

  instructor: svg(`
    <circle cx="22" cy="24" r="9" fill="currentColor"/>
    <path fill="currentColor" d="M6 58c0-12 7-20 16-20s16 8 16 20z"/>
    <path fill="currentColor" fill-rule="evenodd" d="M34 6h24a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H44l-7 6v-6h-3a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4z
      ${hole(39, 17, 2.4)} ${hole(46, 17, 2.4)} ${hole(53, 17, 2.4)}"/>`),
};
