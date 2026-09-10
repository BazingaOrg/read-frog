// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import ProviderSelector from "../provider-selector"

vi.mock("@/components/providers/theme-provider", () => ({
  useTheme: () => ({ theme: "light" }),
}))

describe("ProviderSelector", () => {
  it("renders a placeholder when the selected provider id is empty", () => {
    render(
      <ProviderSelector
        providers={[
          {
            id: "microsoft-translate-default",
            enabled: true,
            name: "Microsoft Translator",
            provider: "microsoft-translate",
          },
        ]}
        value=""
        onChange={() => {}}
      />,
    )

    expect(screen.getByRole("combobox")).toHaveAttribute("data-placeholder")
  })
})
