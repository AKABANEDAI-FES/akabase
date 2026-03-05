import { env } from "cloudflare:workers";
import { dependencies } from "@/infrastructure/di";
import { uploadImage } from "@/application/command/shared/upload-image";
import { authMiddleware, factory } from "./libs";
import z from "zod";
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE, imageScopeSchema } from "@/domain/shared/storage";
import { sValidator } from "@hono/standard-validator";
import { Result } from "@praha/byethrow";

const getStorageHandler = factory.createHandlers(async (c) => {
  const path = c.req.param("path");

  if (!path) {
    return c.notFound();
  }

  const object = await env.STORAGE.get(path);
  if (!object) {
    return c.notFound();
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

const uploadStorageFormSchema = z.object({
  file: z
    .file()
    .max(MAX_FILE_SIZE)
    .mime([...ALLOWED_IMAGE_TYPES]),
  scope: z
    .string()
    .transform((str) => JSON.parse(str))
    .pipe(imageScopeSchema),
});

const postStorageHandler = factory.createHandlers(
  sValidator("form", uploadStorageFormSchema),
  async (c) => {
    const { user } = c.var;
    if (!user) {
      return c.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { file, scope } = c.req.valid("form");

    const arrayBuffer = await file.arrayBuffer();

    const result = await uploadImage(dependencies, {
      file: arrayBuffer,
      contentType: file.type,
      userId: user.id,
      scope,
    });
    if (Result.isFailure(result)) {
      return c.json({ message: result.error.message }, { status: 400 });
    }
    const { imageId, objectKey } = result.value;
    const imageUrl = dependencies.storageService.getPublicUrl(objectKey);
    return c.json({ imageId, url: imageUrl }, { status: 200 });
  },
);

export const storageRoute = factory
  .createApp()
  .use("/upload", authMiddleware)
  .get("/:path{.*}", ...getStorageHandler)
  .post("/upload", ...postStorageHandler);
