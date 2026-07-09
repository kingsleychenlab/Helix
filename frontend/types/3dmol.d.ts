// 3Dmol ships its own types for the package root, but we import the prebuilt
// browser bundle by path (client-side only), which has no bundled declaration.
declare module "3dmol/build/3Dmol.js" {
  const $3Dmol: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  export = $3Dmol;
}
