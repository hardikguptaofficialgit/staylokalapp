import { describe, expect, it } from "vitest";
import { moveItemInArray, remapSelectedIndex } from "../lib/app/move-file-order";

describe("moveItemInArray", () => {
  it("moves an item to a new position", () => {
    expect(moveItemInArray(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveItemInArray(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });
});

describe("remapSelectedIndex", () => {
  it("tracks selection across moves", () => {
    expect(remapSelectedIndex(1, 1, 3)).toBe(3);
    expect(remapSelectedIndex(2, 0, 2)).toBe(1);
    expect(remapSelectedIndex(0, 2, 0)).toBe(1);
  });
});
