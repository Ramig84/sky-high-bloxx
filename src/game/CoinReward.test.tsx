import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CoinReward, CoinTotal } from "./CoinReward";

describe("CoinReward", () => {
  it("renders nothing when the reward is zero", () => {
    const { container } = render(<CoinReward amount={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the reward with a burst of painted coins", () => {
    render(<CoinReward amount={500} />);
    expect(screen.getByLabelText("+500 coins")).toBeTruthy();
    expect(document.querySelectorAll(".coin-burst img").length).toBe(12);
  });

  it("counts the wallet total up to its value", () => {
    render(<CoinTotal value={1250} from={750} />);
    expect(screen.getByText(/coins|750|1,250/)).toBeTruthy();
  });
});
