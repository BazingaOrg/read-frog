import { beforeEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_CONFIG } from "@/utils/constants/config"

const getItemMock = vi.fn<(...args: any[]) => any>()
const getMetaMock = vi.fn<(...args: any[]) => any>()
const setItemMock = vi.fn<(...args: any[]) => any>()
const setMetaMock = vi.fn<(...args: any[]) => any>()

vi.mock("#imports", () => ({
  storage: {
    getItem: getItemMock,
    getMeta: getMetaMock,
    setItem: setItemMock,
    setMeta: setMetaMock,
  },
}))

vi.mock("wxt/utils/storage", () => ({
  storage: {
    getItem: getItemMock,
    getMeta: getMetaMock,
    setItem: setItemMock,
    setMeta: setMetaMock,
  },
}))

vi.mock("@/utils/logger", () => ({
  logger: {
    error: vi.fn<() => void>(),
    warn: vi.fn<() => void>(),
  },
}))

describe("config storage", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("returns a valid stored config", async () => {
    getItemMock.mockResolvedValue(structuredClone(DEFAULT_CONFIG))
    const { getLocalConfig } = await import("../storage")

    await expect(getLocalConfig()).resolves.toEqual(DEFAULT_CONFIG)
  })

  it("does not replace an invalid stored config with defaults", async () => {
    getItemMock.mockResolvedValue({ invalid: true })
    const { getLocalConfig } = await import("../storage")

    await expect(getLocalConfig()).rejects.toMatchObject({
      name: "ConfigMigrationFailedError",
      invalidPaths: expect.any(Array),
    })
    expect(setItemMock).not.toHaveBeenCalled()
    expect(setMetaMock).not.toHaveBeenCalled()
  })
})
