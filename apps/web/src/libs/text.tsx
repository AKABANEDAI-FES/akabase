import { Fragment } from "react/jsx-runtime";

export function nl2br(text: string) {
  return text.split("\n").map((line, index) => (
    <Fragment key={index}>
      {line}
      {index !== text.split("\n").length - 1 && <br />}
    </Fragment>
  ));
}
