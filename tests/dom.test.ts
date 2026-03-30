import { describe, test, expect, mock } from "bun:test";
import { Signal, $s, $c } from "@src/signal";
import { $$, $if, $for } from "@src/dom";

describe("$$", () => {
  describe("tag parsing", () => {
    test("creates element with correct tag", () => {
      const el = $$("div");
      expect(el.tagName).toBe("DIV");
    });

    test("parses single class", () => {
      const el = $$("div.foo");
      expect(el.className).toBe("foo");
    });

    test("parses multiple classes", () => {
      const el = $$("div.foo.bar.baz");
      expect(el.className).toBe("foo bar baz");
    });

    test("parses id", () => {
      const el = $$("div#my-id");
      expect(el.id).toBe("my-id");
    });

    test("parses class and id together", () => {
      const el = $$("div.foo#my-id");
      expect(el.className).toBe("foo");
      expect(el.id).toBe("my-id");
    });

    test("returns correct element type for known tag", () => {
      const el = $$("button");
      expect(el instanceof HTMLButtonElement).toBe(true);
    });

    test("throws on invalid tag", () => {
      expect(() => $$(".no-tag" as any)).toThrow();
    });
  });

  describe("children", () => {
    test("string child sets text content", () => {
      const el = $$("div", "hello");
      expect(el.textContent).toBe("hello");
    });

    test("number child sets text content", () => {
      const el = $$("div", 42);
      expect(el.textContent).toBe("42");
    });

    test("boolean child sets text content", () => {
      const el = $$("div", true);
      expect(el.textContent).toBe("true");
    });

    test("Node child is appended", () => {
      const child = document.createElement("span");
      const el = $$("div", child);
      expect(el.firstChild).toBe(child);
    });

    test("signal child renders initial value", () => {
      const s = new Signal("hello");
      const el = $$("div", s);
      expect(el.textContent).toBe("hello");
    });

    test("signal child updates when signal changes", () => {
      const s = new Signal("hello");
      const el = $$("div", s);
      s.set("world");
      expect(el.textContent).toBe("world");
    });

    test("array of mixed children", () => {
      const el = $$("div", ["hello", " ", "world"]);
      expect(el.textContent).toBe("hello world");
    });

    test("array with Node child", () => {
      const span = document.createElement("span");
      span.textContent = "hi";
      const el = $$("div", [span]);
      expect(el.firstChild).toBe(span);
    });

    test("array with signal child renders initial value", () => {
      const s = new Signal("reactive");
      const el = $$("div", ["static ", s]);
      expect(el.textContent).toBe("static reactive");
    });

    test("array with signal child updates when signal changes", () => {
      const s = new Signal("before");
      const el = $$("div", ["text: ", s]);
      s.set("after");
      expect(el.textContent).toBe("text: after");
    });

    test("children as third arg when attrs passed", () => {
      const el = $$("div", { id: "test" }, "hello");
      expect(el.textContent).toBe("hello");
      expect(el.id).toBe("test");
    });
  });

  describe("attributes", () => {
    test("sets arbitrary attributes", () => {
      const el = $$("input", { type: "text", placeholder: "Enter..." });
      expect(el.getAttribute("type")).toBe("text");
      expect(el.getAttribute("placeholder")).toBe("Enter...");
    });

    test("sets styles", () => {
      const el = $$("div", { styles: { color: "red" } });
      expect(el.style.color).toBe("red");
    });

    test("attaches event listeners", () => {
      const cb = mock(() => {});
      const el = $$("button", { events: { click: cb } });
      el.dispatchEvent(new Event("click"));
      expect(cb).toHaveBeenCalledTimes(1);
    });

    test("reactive class with signal", () => {
      const isActive = new Signal(false);
      const el = $$("div", { class: $c(() => isActive.value ? "active" : "inactive") });
      expect(el.className).toBe("inactive");
      isActive.set(true);
      expect(el.className).toBe("active");
    });

    test("reactive style with signal", () => {
      const color = new Signal("blue");
      const el = $$("div", { styles: { color } });
      expect(el.style.color).toBe("blue");
      color.set("green");
      expect(el.style.color).toBe("green");
    });

    test("reactive attribute with signal", () => {
      const title = new Signal("hello");
      const el = $$("div", { title });
      expect(el.getAttribute("title")).toBe("hello");
      title.set("world");
      expect(el.getAttribute("title")).toBe("world");
    });
  });
});

describe("$if", () => {
  test("renders render() when condition is true", () => {
    const condition = new Signal(true);
    const node = $if(condition, () => {
      const el = document.createElement("span");
      el.textContent = "yes";
      return el;
    });
    expect((node as HTMLElement).textContent).toBe("yes");
  });

  test("renders placeholder when condition is false and no fallback", () => {
    const condition = new Signal(false);
    const node = $if(condition, () => document.createElement("span"));
    expect(node.nodeType).toBe(Node.COMMENT_NODE);
  });

  test("renders fallback when condition is false", () => {
    const condition = new Signal(false);
    const node = $if(
      condition,
      () => $$("span", "yes"),
      () => $$("span", "no")
    );
    expect((node as HTMLElement).textContent).toBe("no");
  });

  test("swaps to render() when condition flips to true", () => {
    const condition = new Signal(false);
    const container = document.createElement("div");
    const node = $if(
      condition,
      () => $$("span", "yes"),
      () => $$("span", "no")
    );
    container.appendChild(node);
    condition.set(true);
    expect(container.textContent).toBe("yes");
  });

  test("swaps to fallback when condition flips to false", () => {
    const condition = new Signal(true);
    const container = document.createElement("div");
    container.appendChild($if(
      condition,
      () => $$("span", "yes"),
      () => $$("span", "no")
    ));
    condition.set(false);
    expect(container.textContent).toBe("no");
  });

  test("swaps multiple times correctly", () => {
    const condition = new Signal(true);
    const container = document.createElement("div");
    container.appendChild($if(
      condition,
      () => $$("span", "yes"),
      () => $$("span", "no")
    ));
    condition.set(false);
    expect(container.textContent).toBe("no");
    condition.set(true);
    expect(container.textContent).toBe("yes");
    condition.set(false);
    expect(container.textContent).toBe("no");
  });
});

describe("$for", () => {
  test("renders initial items", () => {
    const items = new Signal(["a", "b", "c"]);
    const container = $for(items, item => $$("span", item), $$("div"));
    expect(container.children.length).toBe(3);
    expect(container.children.item(0)?.textContent).toBe("a");
    expect(container.children.item(2)?.textContent).toBe("c");
  });

  test("passes correct index to renderItem", () => {
    const items = new Signal(["x", "y", "z"]);
    const indices: number[] = [];
    $for(items, (_, i) => { indices.push(i); return document.createElement("span"); }, $$("div"));
    expect(indices).toEqual([0, 1, 2]);
  });

  test("updates when item is pushed", () => {
    const items = new Signal(["a", "b"]);
    const container = $for(items, item => $$("span", item), $$("div"));
    items.set(prev => [...prev, "c"]);
    expect(container.children.length).toBe(3);
    expect(container.children.item(2)?.textContent).toBe("c");
  });

  test("updates when item is removed", () => {
    const items = new Signal(["a", "b", "c"]);
    const container = $for(items, item => $$("span", item), $$("div"));
    items.set(prev => prev.filter(i => i !== "b"));
    expect(container.children.length).toBe(2);
    expect(container.children.item(0)?.textContent).toBe("a");
    expect(container.children.item(1)?.textContent).toBe("c");
  });

  test("updates when array is fully replaced", () => {
    const items = new Signal(["a", "b", "c"]);
    const container = $for(items, item => $$("span", item), $$("div"));
    items.set(["x", "y"]);
    expect(container.children.length).toBe(2);
    expect(container.children.item(0)?.textContent).toBe("x");
  });

  test("clears when array is emptied", () => {
    const items = new Signal(["a", "b"]);
    const container = $for(items, item => $$("span", item), $$("div"));
    items.set([]);
    expect(container.children.length).toBe(0);
  });

  test("uses div as default container", () => {
    const items = new Signal(["a"]);
    const container = $for(items, item => $$("span", item));
    expect(container.tagName).toBe("DIV");
  });

  test("uses provided container", () => {
    const items = new Signal(["a"]);
    const container = $for(items, item => $$("li", item), $$("ul"));
    expect(container.tagName).toBe("UL");
  });

  test("works with ArraySignal", () => {
    const items = $s(["a", "b", "c"]);
    const container = $for(items, item => $$("span", item), $$("div"));
    expect(container.children.length).toBe(3);
  });
});