import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/libs/auth";
import { z } from "zod";
import { css } from "@akabase/styled-system/css";
import { CalendarDaysIcon } from "lucide-react";
import { Grid } from "@akabase/styled-system/jsx";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/_public/login")({
  validateSearch: loginSearchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.session) {
      throw redirect({
        to: search.redirect ?? "/",
      });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();

  const handleGoogleLogin = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: search.redirect ?? "/",
    });
  };

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
            gap: "6",
          })}
        >
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
              ログイン
            </h2>
            <p
              className={css({
                textStyle: "sm",
                color: "fg.muted",
              })}
            >
              東洋大学のアカウントで続行してください
            </p>
          </div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "3",
              w: "full",
              h: "12",
              px: "4",
              borderRadius: "l2",
              bg: "#17194c",
              color: "white",
              fontWeight: "semibold",
              textStyle: "sm",
              cursor: "pointer",
              transition: "all",
              transitionDuration: "normal",
              _hover: {
                bg: "#1e2060",
                shadow: "sm",
              },
              focusVisibleRing: "outside",
            })}
          >
            東洋アカウントでログイン
          </button>
        </div>
        <p
          className={css({
            textStyle: "xs",
            color: "fg.subtle",
            textAlign: "center",
            lineHeight: "relaxed",
          })}
        >
          ログインすることで、担当する企画の
          <br />
          情報登録・管理が行えるようになります
        </p>
      </div>
    </Grid>
  );
}
