import { createFileRoute, redirect } from "@tanstack/react-router";
import { generateLoadRecentActiveEventQueryOptions } from "@/features/event/actions";
import { CalendarDaysIcon, CalendarOffIcon } from "lucide-react";
import { css } from "styled-system/css";
import { Grid } from "styled-system/jsx";

export const Route = createFileRoute("/_authenticated/")({
  beforeLoad: async ({ context }) => {
    const recentActiveEvent = await context.queryClient.ensureQueryData(
      generateLoadRecentActiveEventQueryOptions(),
    );

    if (recentActiveEvent) {
      throw redirect({
        to: "/$slug",
        params: { slug: recentActiveEvent.slug },
      });
    }
  },
  component: NoActiveEventPage,
});

function NoActiveEventPage() {
  return (
    <Grid placeItems="center" minH="100svh" bg="bg.canvas" position="relative" overflow="hidden">
      <div
        className={css({
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
        })}
      >
        <div
          className={css({
            position: "absolute",
            top: "-20%",
            right: "-10%",
            width: "500px",
            height: "500px",
            borderRadius: "full",
            bg: "iris.3",
            opacity: 0.5,
            filter: "blur(80px)",
          })}
        />
        <div
          className={css({
            position: "absolute",
            bottom: "-15%",
            left: "-10%",
            width: "400px",
            height: "400px",
            borderRadius: "full",
            bg: "iris.4",
            opacity: 0.4,
            filter: "blur(80px)",
          })}
        />
        <div
          className={css({
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right, token(colors.gray.3) 1px, transparent 1px), linear-gradient(to bottom, token(colors.gray.3) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            opacity: 0.4,
            maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 70%)",
          })}
        />
      </div>
      <div
        className={css({
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8",
          w: "full",
          maxW: "md",
          px: "4",
        })}
      >
        <div
          className={css({
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "3",
          })}
        >
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              w: "14",
              h: "14",
              borderRadius: "l3",
              bg: "colorPalette.solid.bg",
              color: "colorPalette.solid.fg",
              shadow: "md",
              colorPalette: "iris",
            })}
          >
            <CalendarDaysIcon size={28} />
          </div>
          <div
            className={css({
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: "1",
            })}
          >
            <h1
              className={css({
                textStyle: "xl",
                fontWeight: "bold",
                color: "fg.default",
                letterSpacing: "-0.02em",
              })}
            >
              大学祭企画管理
            </h1>
            <p
              className={css({
                textStyle: "sm",
                color: "fg.muted",
              })}
            >
              企画情報の登録・管理システム
            </p>
          </div>
        </div>
        <div
          className={css({
            w: "full",
            bg: "bg.default",
            borderRadius: "l3",
            borderWidth: "1px",
            borderColor: "border",
            shadow: "lg",
            p: "8",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4",
          })}
        >
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              w: "12",
              h: "12",
              borderRadius: "full",
              bg: "gray.3",
              color: "fg.muted",
            })}
          >
            <CalendarOffIcon size={24} />
          </div>
          <div
            className={css({
              display: "flex",
              flexDirection: "column",
              gap: "1.5",
              textAlign: "center",
            })}
          >
            <h2
              className={css({
                textStyle: "lg",
                fontWeight: "semibold",
                color: "fg.default",
              })}
            >
              現在開催中のイベントはありません
            </h2>
            <p
              className={css({
                textStyle: "sm",
                color: "fg.muted",
                lineHeight: "relaxed",
              })}
            >
              イベントが開始されると、こちらに表示されます。
            </p>
          </div>
        </div>
      </div>
    </Grid>
  );
}
