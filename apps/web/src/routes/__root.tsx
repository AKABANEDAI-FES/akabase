import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";
import { getSessionFn } from "@/libs/auth";
import type { SessionData } from "@/libs/auth";
import { Toaster } from "@archive/ui/components/toast";
import type { Event } from "@archive/domain/event/schema";
import { LocaleProvider } from "@ark-ui/react/locale";
import { ConfirmHost } from "@/components/confirm";

type MyRouterContext = {
  queryClient: QueryClient;
  session: SessionData;
  activeEvent: Event;
};

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async () => {
    const session = await getSessionFn();
    return {
      session,
    };
  },
  head: () => ({
    meta: [
      {
        charSet: "utf8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "大学祭企画情報管理システム",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body>
        <LocaleProvider locale="ja">
          {children}
          <Toaster />
          <ConfirmHost />
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
          <Scripts />
        </LocaleProvider>
      </body>
    </html>
  );
}
