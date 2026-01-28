import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatMessage, type Message } from "./ChatMessage";

describe("ChatMessage", () => {
  it("shows play button when assistant message has audioUrl", () => {
    const msg: Message = {
      id: "1",
      content: "Hello, sir.",
      role: "assistant",
      timestamp: new Date(),
      audioUrl: "https://example.com/audio.mp3",
    };
    render(<ChatMessage message={msg} />);
    expect(screen.getByTitle("Play reply")).toBeInTheDocument();
  });

  it("does not show play button when assistant message has no audioUrl", () => {
    const msg: Message = {
      id: "1",
      content: "Hello, sir.",
      role: "assistant",
      timestamp: new Date(),
    };
    render(<ChatMessage message={msg} />);
    expect(screen.queryByTitle("Play reply")).not.toBeInTheDocument();
  });

  it("does not show play button for user messages", () => {
    const msg: Message = {
      id: "1",
      content: "Hi",
      role: "user",
      timestamp: new Date(),
      audioUrl: "https://example.com/audio.mp3",
    };
    render(<ChatMessage message={msg} />);
    expect(screen.queryByTitle("Play reply")).not.toBeInTheDocument();
  });

  it("renders hidden audio element with src when audioUrl present", () => {
    const url = "https://example.com/audio.mp3";
    const msg: Message = {
      id: "1",
      content: "Hello.",
      role: "assistant",
      timestamp: new Date(),
      audioUrl: url,
    };
    render(<ChatMessage message={msg} />);
    const audio = document.querySelector('audio[src="https://example.com/audio.mp3"]');
    expect(audio).toBeInTheDocument();
    expect(audio).toHaveClass("hidden");
  });
});
