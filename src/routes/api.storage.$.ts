import { uploadImage } from "@/application/command/shared/upload-image";
import { dependencies } from "@/infrastructure/di";
import { authMiddleware } from "@/libs/session-server";
import { Result } from "@praha/byethrow";
import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/api/storage/$")({
  server: {
    middleware: [authMiddleware],
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const objectKey = url.pathname.replace("/api/storage/", "");

        if (!objectKey) {
          return new Response("Not Found", { status: 404 });
        }

        const object = await env.STORAGE.get(objectKey);
        if (!object) {
          return new Response("Not Found", { status: 404 });
        }

        return new Response(object.body, {
          headers: {
            "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
      POST: async ({
        request,
        context,
      }: {
        request: Request;
        context: { session: { user: { id: string } } };
      }) => {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        if (file instanceof File === false) {
          return new Response(JSON.stringify({ message: "No file uploaded" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const arrayBuffer = await file.arrayBuffer();

        const result = await uploadImage(dependencies, {
          file: arrayBuffer,
          contentType: file.type,
          userId: context.session.user.id,
        });
        if (Result.isFailure(result)) {
          return new Response(JSON.stringify({ message: result.error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { imageId, objectKey } = result.value;
        const imageUrl = dependencies.storageService.getPublicUrl(objectKey);
        return new Response(JSON.stringify({ imageId, url: imageUrl }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
