import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { Table, TableBody, TableCell, TableRow } from "../table";

describe("Table", () => {
  it("applies a sensible min-width and scroll container for small viewports", () => {
    const { getByRole } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Sample</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const table = getByRole("table");
    expect(table.className).toContain("min-w-[40rem]");

    const scrollHost = table.parentElement;
    expect(scrollHost).toBeTruthy();
    expect(scrollHost?.className).toContain("overflow-x-auto");
  });
});
