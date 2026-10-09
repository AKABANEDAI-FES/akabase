import { describe, expect, it } from "vite-plus/test";
import { parseApiKeyMetadata } from "./logic";

describe("parseApiKeyMetadata", () => {
  it("イベントIDを含むメタデータを解析できる", () => {
    expect(parseApiKeyMetadata(JSON.stringify({ eventId: "event-1" }))).toEqual({
      eventId: "event-1",
    });
  });

  it("メタデータがない場合はnullを返す", () => {
    expect(parseApiKeyMetadata(null)).toBeNull();
  });

  it("イベントIDを含まない場合はnullを返す", () => {
    expect(parseApiKeyMetadata(JSON.stringify({}))).toBeNull();
  });

  it("JSONとして不正な場合はnullを返す", () => {
    expect(parseApiKeyMetadata("{")).toBeNull();
  });
});
