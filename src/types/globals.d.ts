declare namespace NodeJS {
  interface Global {}
}

declare const document: {
  body?: { innerText: string };
};

declare class HTMLElement {
  innerText: string;
}
