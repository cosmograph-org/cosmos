declare module '*.frag';
declare module '*.vert';
declare module '*?raw' {
    const content: string
    // eslint-disable-next-line import/no-default-export
    export default content
  }
