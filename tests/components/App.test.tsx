import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../src/App";

const HEADER =
  "year,totpop,pred,latino,white,black,asian,pacis,female,age_cat,ed_hsgrad,ed_somecoll,ed_collgrad,lfp,full_time,full_time_lf,cpmU100,cpmU100_lf,cpmU150,cpmU150_lf";

function row(fields: Record<string, string | number>): string {
  const defaults: Record<string, string | number> = {
    year: 2006,
    totpop: 500000,
    pred: "FALSE",
    latino: "FALSE",
    white: "FALSE",
    black: "FALSE",
    asian: "FALSE",
    pacis: "FALSE",
    female: "FALSE",
    age_cat: "55-59",
    ed_hsgrad: "FALSE",
    ed_somecoll: "FALSE",
    ed_collgrad: "FALSE",
    lfp: 0.5,
    full_time: 0.3,
    full_time_lf: 0.6,
    cpmU100: "NA",
    cpmU100_lf: "NA",
    cpmU150: "NA",
    cpmU150_lf: "NA",
    ...fields,
  };
  return HEADER.split(",").map((key) => String(defaults[key])).join(",");
}

const FIXTURE_CSV = [
  HEADER,
  row({ year: 2006, totpop: 500000, pred: "FALSE" }),
  row({ year: 2007, totpop: 500000, pred: "FALSE" }),
  row({ year: 2020, totpop: 500000, pred: "FALSE" }),
  row({ year: 2020, totpop: 500000, pred: "TRUE" }),
  row({ year: 2040, totpop: 500000, pred: "TRUE" }),
].join("\n");

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(FIXTURE_CSV) }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("shows a loading state and then renders the report, comparison, and results landmarks", async () => {
    render(<App />);

    expect(screen.getByRole("heading", { level: 1, name: /Older Workers in California/i })).toBeInTheDocument();
    expect(screen.getByText(/Loading the projection dataset/i)).toBeInTheDocument();

    expect(await screen.findByRole("heading", { level: 2, name: "Comparisons" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Historical data and projections" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Pacific Islander" })).toBeInTheDocument();
  });

  it("shows an error state with a working retry action", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/Failed to load/i);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(FIXTURE_CSV) }),
    );
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByRole("heading", { level: 2, name: "Comparisons" })).toBeInTheDocument();
  });

  it("starts with one statewide labor-force-participation comparison", async () => {
    render(<App />);
    await screen.findByRole("heading", { level: 2, name: "Comparisons" });

    expect(screen.getByRole("heading", { level: 3, name: "Comparison 1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove comparison 1/i })).not.toBeInTheDocument();
  });

  it("adds a comparison that inherits outcome but resets demographic filters, focusing the new heading", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { level: 2, name: "Comparisons" });

    await user.selectOptions(screen.getByLabelText("Gender", { selector: "#comparison-1-gender" }), "Female");
    await user.click(screen.getByRole("button", { name: "Add a comparison" }));

    const secondHeading = await screen.findByRole("heading", { level: 3, name: "Comparison 2" });
    expect(secondHeading).toHaveFocus();

    const secondCard = secondHeading.closest("section")!;
    expect(within(secondCard).getByLabelText("Gender", { selector: "#comparison-2-gender" })).toHaveValue("");
    expect(screen.getByRole("button", { name: /remove comparison 1/i })).toBeInTheDocument();
  });

  it("enforces a one-comparison minimum by hiding the remove button", async () => {
    render(<App />);
    await screen.findByRole("heading", { level: 2, name: "Comparisons" });
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });

  it("returns focus to the preceding card's heading after removal", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { level: 2, name: "Comparisons" });

    await user.click(screen.getByRole("button", { name: "Add a comparison" }));
    await screen.findByRole("heading", { level: 3, name: "Comparison 2" });
    await user.click(screen.getByRole("button", { name: /remove comparison 2/i }));

    expect(await screen.findByRole("heading", { level: 3, name: "Comparison 1" })).toHaveFocus();
  });

  it("shows the denominator control only for percent format and a supported outcome", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { level: 2, name: "Comparisons" });

    expect(screen.queryByText("Denominator")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Outcome"), "full_time");
    expect(screen.getByText("Denominator")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Raw numbers" }));
    expect(screen.queryByText("Denominator")).not.toBeInTheDocument();
  });

  it("shows the poverty source note only when a comparison uses a poverty outcome", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { level: 2, name: "Comparisons" });

    expect(screen.queryByText(/California Poverty Measure/i)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Outcome"), "cpmU100");
    expect(screen.getByText(/California Poverty Measure/i)).toBeInTheDocument();
  });

  it("switches between the figure and the data table", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { level: 2, name: "Comparisons" });

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Data" }));
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });
});
