import { describe, expect, it } from "vite-plus/test";
import { resolvePlacesWithPath } from "./shared";

describe("resolvePlacesWithPath", () => {
  it("ルートからの名前を返す", () => {
    const places = resolvePlacesWithPath([
      { id: "building", name: "1号館", parentId: null },
      { id: "floor", name: "2階", parentId: "building" },
      { id: "room", name: "201教室", parentId: "floor" },
    ]);

    expect(places.get("room")).toEqual({
      id: "room",
      name: "201教室",
      path: ["1号館", "2階", "201教室"],
    });
    expect(places.get("floor")!.path).toEqual(["1号館", "2階"]);
    expect(places.get("building")!.path).toEqual(["1号館"]);
  });

  it("親が見つからない場合は自身の名前だけを返す", () => {
    const places = resolvePlacesWithPath([
      { id: "orphan", name: "孤立した場所", parentId: "missing" },
    ]);

    expect(places.get("orphan")!.path).toEqual(["孤立した場所"]);
  });

  it("同名の場所を親で区別できる", () => {
    const places = resolvePlacesWithPath([
      { id: "building-1", name: "1号館", parentId: null },
      { id: "building-2", name: "2号館", parentId: null },
      { id: "room-1", name: "101教室", parentId: "building-1" },
      { id: "room-2", name: "101教室", parentId: "building-2" },
    ]);

    expect(places.get("room-1")!.path).toEqual(["1号館", "101教室"]);
    expect(places.get("room-2")!.path).toEqual(["2号館", "101教室"]);
  });

  it("循環参照があっても停止する", () => {
    const places = resolvePlacesWithPath([
      { id: "a", name: "A", parentId: "b" },
      { id: "b", name: "B", parentId: "a" },
    ]);

    expect(places.get("a")!.path).toEqual(["B", "A"]);
    expect(places.get("b")!.path).toEqual(["A", "B"]);
  });

  it("自身を親に持つ場合も停止する", () => {
    const places = resolvePlacesWithPath([{ id: "self", name: "自己参照", parentId: "self" }]);

    expect(places.get("self")!.path).toEqual(["自己参照"]);
  });

  it("空の配列には空のMapを返す", () => {
    expect(resolvePlacesWithPath([]).size).toBe(0);
  });
});
