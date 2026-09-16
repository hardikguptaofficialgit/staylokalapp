declare module "ppt" {
  const ppt: {
    parse_pptcfb: (container: unknown) => unknown;
    utils: { to_text: (presentation: unknown) => string[] };
  };
  export default ppt;
}
