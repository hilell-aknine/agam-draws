// עִפְרוֹנִית: עיפרון צהוב עם פנים, מחק ורוד ופפיון.
// MASCOT_BODY מצויר ב-viewBox 0 0 120 200, החוד ב-(60,196).
window.MASCOT_BODY = `
  <rect x="30" y="14" width="60" height="30" rx="13" fill="#FF8FB8"/>
  <path d="M60 22 L40 8 L40 34 Z" fill="#FF4F93"/>
  <path d="M60 22 L80 8 L80 34 Z" fill="#FF4F93"/>
  <circle cx="60" cy="22" r="6" fill="#E0307A"/>
  <rect x="29" y="42" width="62" height="14" rx="3" fill="#C9CED6"/>
  <rect x="29" y="47" width="62" height="3" fill="#AEB4BE"/>
  <rect x="30" y="56" width="60" height="96" fill="#FFC93C"/>
  <rect x="50" y="56" width="20" height="96" fill="#FFD866"/>
  <path d="M30 152 L90 152 L60 196 Z" fill="#F6D7A7"/>
  <path d="M30 152 Q40 158 45 152 Q52 158 60 152 Q68 158 75 152 Q82 158 90 152" fill="#FFC93C"/>
  <path d="M52 184 L68 184 L60 196 Z" fill="#7B61FF"/>
  <circle cx="47" cy="92" r="8" fill="#2D2A32"/>
  <circle cx="73" cy="92" r="8" fill="#2D2A32"/>
  <circle cx="50" cy="89" r="3" fill="#fff"/>
  <circle cx="76" cy="89" r="3" fill="#fff"/>
  <ellipse cx="38" cy="108" rx="6" ry="4" fill="#FF8FB8" opacity=".8"/>
  <ellipse cx="82" cy="108" rx="6" ry="4" fill="#FF8FB8" opacity=".8"/>
  <path class="mouth" d="M49 110 Q60 124 71 110" fill="none" stroke="#2D2A32" stroke-width="4" stroke-linecap="round"/>
`;
window.mascotSVG = (cls = '') =>
  `<svg class="mascot ${cls}" viewBox="0 0 120 200" aria-hidden="true">${window.MASCOT_BODY}</svg>`;
