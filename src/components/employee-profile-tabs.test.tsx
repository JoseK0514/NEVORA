import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { EmployeeProfileTabs } from "./employee-profile-tabs";

it("exposes both editable sections and anchor navigation before enhancement", () => {
  const html = renderToStaticMarkup(
    <EmployeeProfileTabs
      details={<form><input name="firstName" defaultValue="Sam" /></form>}
      scheduling={<form><input type="checkbox" name="positionIds" value="support" /></form>}
    />,
  );
  expect(html).toContain('aria-label="Employee profile sections"');
  expect(html).toContain("Details");
  expect(html).toContain("Scheduling");
  expect(html).toContain('name="firstName"');
  expect(html).toContain('name="positionIds"');
  expect(html).not.toContain('hidden=""');
  const ids = [...html.matchAll(/id="([^"]+-profile-panel-\d)"/g)].map(match => match[1]);
  expect(ids).toHaveLength(2);
  for (const id of ids) expect(html).toContain(`href="#${id}"`);
});
