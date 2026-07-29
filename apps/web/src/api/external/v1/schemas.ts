import { z } from "zod";
import { externalProjectDetailSchema } from "@akabase/application/query/project/get-external-project";
import { externalProjectListItemSchema } from "@akabase/application/query/project/list-external-projects";

export const errorResponseSchema = z.object({ message: z.string() });

export const projectListResponseSchema = z.object({
  projects: z.array(externalProjectListItemSchema.extend({ publishedAt: z.iso.datetime() })),
});

export const projectDetailResponseSchema = externalProjectDetailSchema
  .omit({ webContentJson: true })
  .extend({
    webContentHtml: z.string().nullable(),
    publishedAt: z.iso.datetime(),
  });
