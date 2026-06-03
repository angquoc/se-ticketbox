// CSS Modules
declare module '*.css' {
  const styles: { readonly [key: string]: string };
  export default styles;
}

// Global CSS (side-effect imports như globals.css)
declare module '*.css' {
  const content: string;
  export default content;
}

// SCSS (nếu sau này dùng)
declare module '*.scss' {
  const styles: { readonly [key: string]: string };
  export default styles;
}

// SVG
declare module '*.svg' {
  import type { FC, SVGProps } from 'react';
  const ReactComponent: FC<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}

// Images
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

// Fonts
declare module '*.woff' {
  const src: string;
  export default src;
}

declare module '*.woff2' {
  const src: string;
  export default src;
}
