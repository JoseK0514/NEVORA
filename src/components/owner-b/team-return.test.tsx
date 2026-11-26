import { expect, it } from "@rstest/core";
import { renderToStaticMarkup } from "react-dom/server";
import { CorpNav } from "../corp/corp";
import { TeamProfileBack } from "./team-return";

it("preserves the direct profile header child used by the phone and desktop layouts", () => {
  const nav = <CorpNav back={{href: "/app/employees", label: "Equipo"}} title="Daniel Cruz" right="Editar" phoneOnly />;
  expect(renderToStaticMarkup(<TeamProfileBack>{nav}</TeamProfileBack>)).toBe(renderToStaticMarkup(nav));
});
