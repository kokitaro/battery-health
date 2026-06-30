// Ambient module declarations so the strict TS build accepts CSS modules,
// side-effect CSS imports, and the untyped VANTA effect bundle.

declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.css";

declare module "vanta/dist/vanta.waves.min" {
  // VANTA effect factory: returns an object exposing destroy() and setOptions().
  const effect: (options: Record<string, unknown>) => {
    destroy: () => void;
    setOptions: (options: Record<string, unknown>) => void;
  };
  export default effect;
}


declare module "*.jpg" {
  const src: string;
  export default src;
}
declare module "*.jpeg" {
  const src: string;
  export default src;
}
declare module "*.png" {
  const src: string;
  export default src;
}
declare module "*.webp" {
  const src: string;
  export default src;
}
