declare module "iframe-resizer" {
  interface IFrameObject {
    close(): void;
    moveToAnchor(anchor: string): void;
    removeListeners(): void;
    resize(): void;
    sendMessage(message: unknown, targetOrigin?: string): void;
  }

  export interface IFrameComponent extends HTMLIFrameElement {
    iFrameResizer: IFrameObject;
  }

  export interface IFrameOptions {
    autoResize?: boolean;
    bodyBackground?: string;
    bodyMargin?: string | number;
    bodyPadding?: string | number;
    checkOrigin?: boolean | string[];
    inPageLinks?: boolean;
    heightCalculationMethod?:
      | "bodyOffset"
      | "bodyScroll"
      | "documentElementOffset"
      | "documentElementScroll"
      | "lowestElement"
      | "max"
      | "min"
      | "taggedElement";
    widthCalculationMethod?: string;
    interval?: number;
    log?: boolean;
    maxHeight?: number;
    maxWidth?: number;
    minHeight?: number;
    minWidth?: number;
    resizeFrom?: "parent" | "child";
    scrolling?: boolean | "auto";
    sizeHeight?: boolean;
    sizeWidth?: boolean;
    tolerance?: number;
    warningTimeout?: number;
    onInit?(iframe: IFrameComponent): void;
    onClosed?(iframeId: string): void;
    onResized?(data: {
      iframe: IFrameComponent;
      height: number;
      width: number;
      type: string;
    }): void;
  }

  export function iframeResizer(
    options: IFrameOptions,
    target: string | HTMLElement,
  ): IFrameComponent[];

  export function iframeResize(
    options: IFrameOptions,
    target: string | HTMLElement,
  ): IFrameComponent[];
}
