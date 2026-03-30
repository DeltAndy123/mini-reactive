import type { Signal } from "./signal";
import { type ReadableSignal, isSignal, $s, $c } from "./signal";

interface Attributes {
  events?: {
    [K in keyof HTMLElementEventMap]?: (event: HTMLElementEventMap[K]) => void
  };
  styles?: {
    [K in keyof CSSStyleDeclaration as CSSStyleDeclaration[K] extends string ? K : never]?: string | ReadableSignal<string>;
  };
  [key: string]: unknown;
}

type ExtractTag<S extends string> =
  S extends `${infer Before}.${string}` ? ExtractTag<Before> :
  S extends `${infer Before}#${string}` ? ExtractTag<Before> :
  S;

type ElementForSelector<S extends string> =
  ExtractTag<S> extends keyof HTMLElementTagNameMap
    ? HTMLElementTagNameMap[ExtractTag<S>]
    : HTMLElement;

type Children = string | number | boolean | Node | ReadableSignal<unknown> |
          Array<string | number | boolean | Node | ReadableSignal<unknown>>;

export function $$<T extends keyof HTMLElementTagNameMap | (string & {})>(
  tag: T,
  childrenOrAttrs?: Children | Attributes,
  children?: Children
): ElementForSelector<T> {
  let attrs: Attributes = {};
  if (
    typeof childrenOrAttrs === "object" &&
    childrenOrAttrs !== null &&
    !Array.isArray(childrenOrAttrs) &&
    !isSignal(childrenOrAttrs) &&
    !(childrenOrAttrs instanceof Node)
  ) {
    attrs = childrenOrAttrs;
  } else if (childrenOrAttrs !== undefined) {
    children = childrenOrAttrs;
  }

  const tagName = tag.match(/^([a-zA-Z][a-zA-Z0-9]*)/)?.[1] ?? null;
  if (!tagName) {
    throw new Error(`Invalid tag name in "${tag}"`);
  }
  const classes = [...tag.matchAll(/\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g)].map(m => m[1]);
  const id = tag.match(/#([a-zA-Z_-][a-zA-Z0-9_-]*)/)?.[1] ?? null;

  const element = document.createElement(tagName) as ElementForSelector<T>;
  if (id) {
    element.id = id;
  }
  if (classes.length > 0) {
    element.className = classes.join(" ");
  }

  for (const [attr, value] of Object.entries(attrs)) {
    if (attr === "events" && typeof value === "object" && value !== null) {
      for (const [event, listener] of Object.entries(value)) {
        element.addEventListener(event, listener);
      }
    } else if (attr === "styles" && typeof value === "object" && value !== null) {
      for (const [prop, val] of Object.entries(value)) {
        if (isSignal(val)) {
          val.subscribe(() => {
            (element.style as any)[prop] = val.value;
          });
        } else {
          (element.style as any)[prop] = val;
        }
      }
    } else if (attr in element) {
      if (isSignal(value)) {
        value.subscribe(() => {
          (element as any)[attr] = value.value;
        });
      } else {
        (element as any)[attr] = value;
      }
    } else {
      if (isSignal(value)) {
        value.subscribe(() => {
          element.setAttribute(attr, String(value.value));
        });
      } else {
        element.setAttribute(attr, String(value));
      }
    }
  }

  if (typeof children === "string") {
    element.appendChild(document.createTextNode(children));
  } else if (children instanceof Node) {
    element.appendChild(children);
  } else if (isSignal(children)) {
    const textNode = document.createTextNode(String(children.value));
    element.appendChild(textNode);
    children.subscribe(() => {
      textNode.textContent = String(children.value);
    }, false);
  } else if (Array.isArray(children)) {
    children.forEach((child) => {
      if (typeof child === "string") {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      } else if (isSignal(child)) {
        const textNode = document.createTextNode(String(child.value));
        element.appendChild(textNode);
        child.subscribe(() => {
          textNode.textContent = String(child.value);
        }, false);
      } else {
        element.appendChild(document.createTextNode(String(child)));
      }
    });
  } else if (children !== undefined) {
    element.appendChild(document.createTextNode(String(children)));
  }

  return element;
}


// Helper rendering functions
export function $t(text: string | number | boolean): Node {
  return document.createTextNode(String(text));
}

export function $if(
  condition: ReadableSignal<boolean>,
  render: () => Node,
  fallback?: () => Node
): Node {
  const placeholder = document.createComment("$if");
  let current: Node = condition.value ? render() : (fallback?.() ?? placeholder);

  condition.subscribe((val) => {
    const next = val ? render() : (fallback?.() ?? placeholder);
    current.parentNode?.replaceChild(next, current);
    current = next;
  }, false);

  return current;
}

export function $for<T>(
  items: ReadableSignal<T[]>,
  renderItem: (item: T, index: number) => Node,
  container: HTMLElement = document.createElement("div")
): HTMLElement {
  items.subscribe(arr => {
    container.innerHTML = "";
    arr.forEach((item, index) => container.appendChild(renderItem(item, index)));
  });
  return container;
}