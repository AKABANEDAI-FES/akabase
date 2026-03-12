import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { app } from "./api";

export default createServerEntry({
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return app.fetch(request);
    }

    return handler.fetch(request);
  },
});
