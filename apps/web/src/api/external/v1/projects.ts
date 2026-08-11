import { env } from "cloudflare:workers";
import { z } from "zod";
import { describeRoute, resolver, validator } from "hono-openapi";
import { ImageRepositoryImpl } from "@akabase/infrastructure/storage/image-repository";
import { listExternalProjects } from "@akabase/application/query/project/list-external-projects";
import { getExternalProject } from "@akabase/application/query/project/get-external-project";
import { projectIdSchema } from "@akabase/domain/project/schema";
import { externalFactory } from "../libs";
import {
  errorResponseSchema,
  projectDetailResponseSchema,
  projectListResponseSchema,
} from "./schemas";
import { renderWebContentHtml, toAbsoluteUrl } from "@/features/project/utils/web-content";

const getProjectsHandler = externalFactory.createHandlers(
  describeRoute({
    summary: "企画の一覧を取得",
    description: "API キーに紐づくイベントの企画を一覧で返します",
    responses: {
      200: {
        description: "企画の一覧",
        content: { "application/json": { schema: resolver(projectListResponseSchema) } },
      },
    },
  }),
  async (c) => {
    const imageRepo = new ImageRepositoryImpl(env.STORAGE, c.var.db);
    const projects = await listExternalProjects({ db: c.var.db, imageRepo }, c.var.eventId);
    const projectsWithAbsoluteLogoUrl = projects.map((project) => ({
      ...project,
      logoUrl: toAbsoluteUrl(project.logoUrl, env.BETTER_AUTH_URL),
    }));

    return c.json(
      { projects: projectsWithAbsoluteLogoUrl },
      { status: 200, headers: { "Cache-Control": "private, max-age=60" } },
    );
  },
);

const getProjectHandler = externalFactory.createHandlers(
  describeRoute({
    summary: "企画の詳細を取得",
    description:
      "指定された企画の詳細を返します。Web コンテンツはレンダリング済みの HTML 文字列です。",
    responses: {
      200: {
        description: "企画の詳細",
        content: { "application/json": { schema: resolver(projectDetailResponseSchema) } },
      },
      404: {
        description: "企画が存在しない、もしくは公開されていません",
        content: { "application/json": { schema: resolver(errorResponseSchema) } },
      },
    },
  }),
  validator("param", z.object({ projectId: projectIdSchema })),
  async (c) => {
    const { projectId } = c.req.valid("param");
    const imageRepo = new ImageRepositoryImpl(env.STORAGE, c.var.db);

    const project = await getExternalProject({ db: c.var.db, imageRepo }, c.var.eventId, projectId);

    if (project === null) {
      return c.json({ message: "Project not found" }, { status: 404 });
    }

    const { webContentJson, ...rest } = project;
    const logoUrl = toAbsoluteUrl(project.logoUrl, env.BETTER_AUTH_URL);
    const organization = {
      ...project.organization,
      logoUrl: toAbsoluteUrl(project.organization.logoUrl, env.BETTER_AUTH_URL),
    };
    return c.json(
      {
        ...rest,
        logoUrl,
        organization,
        webContentHtml: renderWebContentHtml(webContentJson, env.BETTER_AUTH_URL),
      },
      { status: 200, headers: { "Cache-Control": "private, max-age=60" } },
    );
  },
);

export const projectsRoute = externalFactory
  .createApp()
  .get("/", ...getProjectsHandler)
  .get("/:projectId", ...getProjectHandler);
