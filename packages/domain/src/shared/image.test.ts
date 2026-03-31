import { describe, expect, it } from "vite-plus/test";
import { Result } from "@archive/result";
import {
  ALLOWED_IMAGE_TYPES,
  IMAGE_VALIDATION_ERROR_CODE,
  MAX_FILE_SIZE,
  ValidatedImage,
} from "./image";

describe("ValidatedImage", () => {
  describe("create", () => {
    it("有効な画像を生成する", () => {
      const file = new ArrayBuffer(1024);
      const result = ValidatedImage.create(file, "image/png");

      expect(Result.isSuccess(result)).toBe(true);
      if (Result.isSuccess(result)) {
        expect(result.value.contentType).toBe("image/png");
        expect(result.value.size).toBe(1024);
        expect(result.value.file).toBe(file);
      }
    });

    for (const type of ALLOWED_IMAGE_TYPES) {
      it(`${type} を許可する`, () => {
        const file = new ArrayBuffer(100);
        const result = ValidatedImage.create(file, type);
        expect(Result.isSuccess(result)).toBe(true);
      });
    }

    it("サイズ上限ちょうどの画像を許可する", () => {
      const file = new ArrayBuffer(MAX_FILE_SIZE);
      const result = ValidatedImage.create(file, "image/jpeg");
      expect(Result.isSuccess(result)).toBe(true);
    });

    it("サイズ超過の画像を拒否する", () => {
      const file = new ArrayBuffer(MAX_FILE_SIZE + 1);
      const result = ValidatedImage.create(file, "image/jpeg");

      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.error.code).toBe(IMAGE_VALIDATION_ERROR_CODE.FILE_TOO_LARGE);
      }
    });

    it("不正なコンテンツタイプを拒否する", () => {
      const file = new ArrayBuffer(100);
      const result = ValidatedImage.create(file, "image/gif");

      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.error.code).toBe(IMAGE_VALIDATION_ERROR_CODE.INVALID_FILE_TYPE);
      }
    });

    it("空のコンテンツタイプを拒否する", () => {
      const file = new ArrayBuffer(100);
      const result = ValidatedImage.create(file, "");

      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.error.code).toBe(IMAGE_VALIDATION_ERROR_CODE.INVALID_FILE_TYPE);
      }
    });

    it("サイズ超過はコンテンツタイプより先に検査される", () => {
      const file = new ArrayBuffer(MAX_FILE_SIZE + 1);
      const result = ValidatedImage.create(file, "image/gif");

      expect(Result.isFailure(result)).toBe(true);
      if (Result.isFailure(result)) {
        expect(result.error.code).toBe(IMAGE_VALIDATION_ERROR_CODE.FILE_TOO_LARGE);
      }
    });
  });
});
