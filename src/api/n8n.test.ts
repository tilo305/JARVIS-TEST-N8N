import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  classifyIntent,
  extractAudioFromResponse,
  normalizeN8NResponse,
  type N8NResponse,
} from "./n8n";

describe("extractAudioFromResponse", () => {
  const blobUrls: string[] = [];
  const mockCreate = vi.fn(
    (_blob: Blob) => `blob:mock-${Math.random().toString(36).slice(2)}`
  );
  const mockRevoke = vi.fn();
  let origCreate: typeof URL.createObjectURL | undefined;
  let origRevoke: typeof URL.revokeObjectURL | undefined;

  beforeEach(() => {
    blobUrls.length = 0;
    origCreate = (URL as unknown as { createObjectURL?: typeof URL.createObjectURL })
      .createObjectURL;
    origRevoke = (URL as unknown as { revokeObjectURL?: typeof URL.revokeObjectURL })
      .revokeObjectURL;
    Object.defineProperty(URL, "createObjectURL", {
      value: mockCreate,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      value: mockRevoke,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      value: origCreate,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      value: origRevoke,
      configurable: true,
      writable: true,
    });
  });

  function trackBlobUrl(url: string) {
    if (url.startsWith("blob:")) blobUrls.push(url);
  }

  it("returns null when raw is a string", () => {
    expect(extractAudioFromResponse("hello")).toBeNull();
  });

  it("returns null when raw is null or undefined", () => {
    expect(extractAudioFromResponse(null as unknown as N8NResponse)).toBeNull();
    expect(extractAudioFromResponse(undefined as unknown as N8NResponse)).toBeNull();
  });

  it("returns null when raw has no audio", () => {
    expect(extractAudioFromResponse({})).toBeNull();
    expect(extractAudioFromResponse({ message: "hi" })).toBeNull();
  });

  it("returns audio.url when present and non-empty", () => {
    const url = "https://example.com/audio.mp3";
    expect(extractAudioFromResponse({ audio: { url } })).toBe(url);
    expect(extractAudioFromResponse({ audio: { url: "  " } })).toBeNull();
  });

  it("returns blob URL when audio.data (base64) and format mp3", () => {
    const b64 = "SGVsbG8="; // "Hello" in base64
    const res = extractAudioFromResponse({
      message: "Hi",
      audio: { data: b64, format: "mp3" },
    });
    expect(res).not.toBeNull();
    expect(typeof res).toBe("string");
    expect(res!).toMatch(/^blob:/);
    trackBlobUrl(res!);
  });

  it("returns blob URL when audio.data and format wav", () => {
    const b64 = "SGVsbG8=";
    const res = extractAudioFromResponse({
      audio: { data: b64, format: "wav" },
    });
    expect(res).not.toBeNull();
    expect(res!).toMatch(/^blob:/);
    trackBlobUrl(res!);
  });

  it("defaults to audio/mpeg when format missing", () => {
    const b64 = "SGVsbG8=";
    const res = extractAudioFromResponse({ audio: { data: b64 } });
    expect(res).not.toBeNull();
    expect(res!).toMatch(/^blob:/);
    trackBlobUrl(res!);
  });

  it("returns null when audio.data is empty or invalid base64", () => {
    expect(extractAudioFromResponse({ audio: { data: "" } })).toBeNull();
    expect(extractAudioFromResponse({ audio: { data: "  " } })).toBeNull();
    expect(extractAudioFromResponse({ audio: { data: "!!!invalid!!!" } })).toBeNull();
  });

  it("prefers audio.url over audio.data when both present", () => {
    const url = "https://example.com/audio.mp3";
    const res = extractAudioFromResponse({
      audio: { url, data: "SGVsbG8=", format: "mp3" },
    });
    expect(res).toBe(url);
  });
});

describe("normalizeN8NResponse", () => {
  it("returns string as-is", () => {
    expect(normalizeN8NResponse("hello")).toBe("hello");
  });

  it("returns message | response | text | content", () => {
    expect(normalizeN8NResponse({ message: "a" })).toBe("a");
    expect(normalizeN8NResponse({ response: "b" })).toBe("b");
    expect(normalizeN8NResponse({ text: "c" })).toBe("c");
    expect(normalizeN8NResponse({ content: "d" })).toBe("d");
    expect(normalizeN8NResponse({ message: "m", response: "r" })).toBe("m");
  });

  it("falls back to default when no text field", () => {
    expect(normalizeN8NResponse({})).toBe("Processing complete, sir.");
    expect(
      normalizeN8NResponse({ audio: { data: "x", format: "mp3" } })
    ).toBe("Audio response received, sir.");
  });
});

describe("classifyIntent (Agentic Routing)", () => {
  it("returns 'booker' for booking-related phrases", () => {
    expect(classifyIntent("Book me a flight to London")).toBe("booker");
    expect(classifyIntent("I need a hotel in Paris")).toBe("booker");
    expect(classifyIntent("reserve a table")).toBe("booker");
    expect(classifyIntent("rent a car")).toBe("booker");
    expect(classifyIntent("train ticket to Berlin")).toBe("booker");
  });

  it("returns 'info' for non-booking queries", () => {
    expect(classifyIntent("What is the capital of Italy?")).toBe("info");
    expect(classifyIntent("Tell me about quantum physics")).toBe("info");
    expect(classifyIntent("Hello")).toBe("info");
  });

  it("returns 'general' when text is empty or not a string", () => {
    expect(classifyIntent("")).toBe("general");
    expect(classifyIntent("   ")).toBe("general");
    expect(classifyIntent(null as unknown as string)).toBe("general");
    expect(classifyIntent(undefined as unknown as string)).toBe("general");
  });
});
