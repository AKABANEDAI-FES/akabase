import { describe, expect, test } from "vitest";
import { Result } from "@praha/byethrow";
import { suspend } from "./suspend";

describe("suspend", () => {
  test("should return Result from sync function", () => {
    const result = suspend(() => Result.succeed(42));
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe(42);
    }
  });

  test("should return Failure from sync function", () => {
    const result = suspend(() => Result.fail("error"));
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("error");
    }
  });

  test("should return ResultAsync from async function", async () => {
    const result = suspend(async () => Result.succeed(42));
    const resolved = await result;
    expect(Result.isSuccess(resolved)).toBe(true);
    if (Result.isSuccess(resolved)) {
      expect(resolved.value).toBe(42);
    }
  });

  test("should return Failure from async function", async () => {
    const result = suspend(async () => Result.fail("async error"));
    const resolved = await result;
    expect(Result.isFailure(resolved)).toBe(true);
    if (Result.isFailure(resolved)) {
      expect(resolved.error).toBe("async error");
    }
  });
});
