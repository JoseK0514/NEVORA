import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, rs } from '@rstest/core';
import { redirect } from "next/navigation";
import { HeldReviewNote, holdUnconfirmedReview, releaseUnconfirmedReview, rememberLostReply, unconfirmedReview } from "./coverage-review-hold";
import { unconfirmedCheck } from "./coverage-review";

rs.mock("next/link", () => ({ default: ({ children, ...props }: ComponentProps<"a">) => createElement("a", props, children) }));
afterEach(() => { releaseUnconfirmedReview("review-a"); releaseUnconfirmedReview("review-b"); });

const check = unconfirmedCheck(true, "/app/schedule/coverage?repair=gap&refresh=1");
const data = () => { const form = new FormData(); form.set("coverageRepairReview", "review-a"); form.set("employeeId", "E1"); return form; };

it("G71: a lost reply holds that review (and only that one) until it is released; the action gets the same data", async () => {
  const action = rs.fn(async () => { throw new TypeError("Load failed"); });
  const form = data();
  await expect(rememberLostReply(action, "review-a", check)(form)).rejects.toThrow("Load failed");
  expect(action).toHaveBeenCalledWith(form);
  expect(unconfirmedReview("review-a")).toEqual(check);
  expect(unconfirmedReview("review-b")).toBeNull();
  releaseUnconfirmedReview("review-a");
  expect(unconfirmedReview("review-a")).toBeNull();
});

it("G71: an answer or a redirect holds nothing", async () => {
  expect(await rememberLostReply(async () => ({ error: "Refused" }), "review-a", check)(data())).toEqual({ error: "Refused" });
  await expect(rememberLostReply(async () => redirect("/app/schedule/coverage?saved=1"), "review-a", check)(data())).rejects.toBeTruthy();
  expect(unconfirmedReview("review-a")).toBeNull();
});

it("G71: the server render of the stale page keeps its usual words, so hydration matches", () => {
  holdUnconfirmedReview("review-a", check);
  const html = renderToStaticMarkup(createElement(HeldReviewNote, { token: "review-a" }, createElement("p", null, "This shift was updated after you opened the review.")));
  expect(html).toContain("This shift was updated after you opened the review.");
  expect(html).not.toContain("could not be confirmed");
});
