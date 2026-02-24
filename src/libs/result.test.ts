import { describe, expect, expectTypeOf, test } from "vitest";
import { Result } from "@praha/byethrow";
import { gen, suspend } from "./result";

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
    const result = suspend(() => Promise.resolve(Result.succeed(42)));
    const resolved = await result;
    expect(Result.isSuccess(resolved)).toBe(true);
    if (Result.isSuccess(resolved)) {
      expect(resolved.value).toBe(42);
    }
  });

  test("should return Failure from async function", async () => {
    const result = suspend(() => Promise.resolve(Result.fail("async error")));
    const resolved = await result;
    expect(Result.isFailure(resolved)).toBe(true);
    if (Result.isFailure(resolved)) {
      expect(resolved.error).toBe("async error");
    }
  });
});

describe("gen", () => {
  test("should handle successful sync generator", () => {
    const result = gen(function* ($) {
      const a = yield* $(Result.succeed(1));
      const b = yield* $(Result.succeed(2));
      return a + b;
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe(3);
    }
  });

  test("should short-circuit on first failure in sync generator", () => {
    const result = gen(function* ($) {
      const a = yield* $(Result.succeed(1));
      const b = yield* $(Result.fail("error"));
      const c = yield* $(Result.succeed(3));
      return a + b + c;
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("error");
    }
  });

  test("should handle multiple failures and return first one", () => {
    const result = gen(function* ($) {
      yield* $(Result.fail("first error"));
      yield* $(Result.fail("second error"));
      return 42;
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("first error");
    }
  });

  test("should handle async generator with all successes", async () => {
    const result = gen(async function* ($) {
      const a = yield* $(Result.succeed(10));
      const b = yield* $(Result.succeed(20));
      const c = yield* $(Result.succeed(30));
      return a + b + c;
    });

    const resolved = await result;
    expect(Result.isSuccess(resolved)).toBe(true);
    if (Result.isSuccess(resolved)) {
      expect(resolved.value).toBe(60);
    }
  });

  test("should short-circuit on first failure in async generator", async () => {
    const result = gen(async function* ($) {
      const a = yield* $(Result.succeed(10));
      const b = yield* $(Result.fail("async error"));
      const c = yield* $(Result.succeed(30));
      return a + b + c;
    });

    const resolved = await result;
    expect(Result.isFailure(resolved)).toBe(true);
    if (Result.isFailure(resolved)) {
      expect(resolved.error).toBe("async error");
    }
  });

  test("should handle complex operations in generator", () => {
    const divide = (a: number, b: number): Result.Result<number, string> => {
      if (b === 0) return Result.fail("division by zero");
      return Result.succeed(a / b);
    };

    const result = gen(function* ($) {
      const a = yield* $(divide(10, 2));
      const b = yield* $(divide(20, 4));
      const c = yield* $(divide(a + b, 2));
      return c;
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe(5);
    }
  });

  test("should fail on division by zero", () => {
    const divide = (a: number, b: number): Result.Result<number, string> => {
      if (b === 0) return Result.fail("division by zero");
      return Result.succeed(a / b);
    };

    const result = gen(function* ($) {
      const a = yield* $(divide(10, 2));
      const b = yield* $(divide(20, 0)); // This will fail
      const c = yield* $(divide(a + b, 2));
      return c;
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("division by zero");
    }
  });

  test("should work with mixed async operations", async () => {
    const asyncOp = (x: number): Promise<Result.Result<number, string>> => {
      return Promise.resolve(Result.succeed(x * 2));
    };

    const result = gen(async function* ($) {
      const a = yield* $(await asyncOp(5));
      const b = yield* $(await asyncOp(10));
      return a + b;
    });

    const resolved = await result;
    expect(Result.isSuccess(resolved)).toBe(true);
    if (Result.isSuccess(resolved)) {
      expect(resolved.value).toBe(30);
    }
  });

  test("should handle generator with no failures", () => {
    const result = gen(function* ($) {
      return yield* $(Result.succeed(42));
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toBe(42);
    }
  });

  test("should handle type inference correctly", () => {
    const result = gen(function* ($) {
      const str = yield* $(Result.succeed("hello"));
      const num = yield* $(Result.succeed(123));
      const bool = yield* $(Result.succeed(true));
      return { str, num, bool };
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual({ str: "hello", num: 123, bool: true });
    }
  });

  describe("type tests", () => {
    test("should infer correct return type for sync generator", () => {
      const result = gen(function* ($) {
        const a = yield* $(Result.succeed(1));
        const b = yield* $(Result.succeed(2));
        return a + b;
      });

      expectTypeOf(result).toEqualTypeOf<Result.Result<number, never>>();
    });

    test("should infer correct return type for async generator", () => {
      const result = gen(async function* ($) {
        const a = yield* $(Result.succeed(10));
        const b = yield* $(Result.succeed(20));
        return a + b;
      });

      expectTypeOf(result).toEqualTypeOf<Promise<Result.Result<number, never>>>();
    });

    test("should compose multiple Result types correctly", () => {
      const result = gen(function* ($) {
        const str = yield* $(Result.succeed("hello"));
        const num = yield* $(Result.succeed(42));
        const bool = yield* $(Result.succeed(true));
        return { str, num, bool } as { str: string; num: number; bool: boolean };
      });

      expectTypeOf(result).toEqualTypeOf<
        Result.Result<{ str: string; num: number; bool: boolean }, never>
      >();
    });

    test("should infer error union types correctly", () => {
      const result = gen(function* ($) {
        const a = yield* $(Result.succeed(1) as Result.Result<number, "error1">);
        const b = yield* $(Result.succeed(2) as Result.Result<number, "error2">);
        return a + b;
      });

      expectTypeOf(result).toEqualTypeOf<Result.Result<number, "error1" | "error2">>();
    });

    test("should handle complex error types", () => {
      type DivisionError = { type: "division_by_zero"; divisor: number };
      type ValidationError = { type: "validation_error"; message: string };

      const divide = (a: number, b: number): Result.Result<number, DivisionError> => {
        if (b === 0) return Result.fail({ type: "division_by_zero", divisor: b });
        return Result.succeed(a / b);
      };

      const validate = (x: number): Result.Result<number, ValidationError> => {
        if (x < 0) return Result.fail({ type: "validation_error", message: "negative" });
        return Result.succeed(x);
      };

      const result = gen(function* ($) {
        const divided = yield* $(divide(10, 2));
        const validated = yield* $(validate(divided));
        return validated;
      });

      expectTypeOf(result).toEqualTypeOf<Result.Result<number, DivisionError | ValidationError>>();
    });

    test("should preserve value types through composition", () => {
      const result = gen(function* ($) {
        const user = yield* $(
          Result.succeed({ id: 1, name: "Alice" } as { id: number; name: string }),
        );
        const posts = yield* $(
          Result.succeed([{ title: "Post 1" }, { title: "Post 2" }] as Array<{ title: string }>),
        );
        return { user, posts };
      });

      expectTypeOf(result).toEqualTypeOf<
        Result.Result<
          {
            user: { id: number; name: string };
            posts: Array<{ title: string }>;
          },
          never
        >
      >();
    });

    test("should infer async Result composition correctly", () => {
      const asyncOp = (x: number): Promise<Result.Result<number, string>> => {
        return Promise.resolve(Result.succeed(x * 2));
      };

      const result = gen(async function* ($) {
        const a = yield* $(await asyncOp(5));
        const b = yield* $(await asyncOp(10));
        return a + b;
      });

      expectTypeOf(result).toEqualTypeOf<Promise<Result.Result<number, string>>>();
    });
  });
});
