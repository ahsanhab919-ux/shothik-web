import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDispatch = vi.fn();
const mockCreatePost = vi.fn();
const mockAddChatMessage = vi.fn();
const mockReactToPost = vi.fn();
const mockReserveForum = vi.fn();
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

const mockState = {
  auth: {
    user: null,
  },
};

const { api } = vi.hoisted(() => ({
  api: {
    forums: {
      getForumById: "getForumById",
      getForumPosts: "getForumPosts",
      getChatMessages: "getChatMessages",
      createPost: "createPost",
      addChatMessage: "addChatMessage",
      reactToPost: "reactToPost",
      reserveForum: "reserveForum",
      hasReserved: "hasReserved",
    },
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ forumId: "forum-1" }),
  useSearchParams: () => ({
    get: () => null,
  }),
}));

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock("@/convex/_generated/api", () => ({
  api,
}));

vi.mock("@/components/forum/CountdownTimer", () => ({
  default: () => <div data-testid="countdown-timer" />,
}));

vi.mock("@/components/forum/ForumPost", () => ({
  default: ({ onReact }: { onReact: (postId: string, reactionType: string) => void }) => (
    <button onClick={() => onReact("post-1", "intrigued")}>React to first post</button>
  ),
}));

import { ForumPage } from "./page";
import { setShowLoginModal } from "@/redux/slices/auth";

describe("ForumPage guest actions", () => {
  beforeEach(() => {
    mockDispatch.mockReset();
    mockCreatePost.mockReset();
    mockAddChatMessage.mockReset();
    mockReactToPost.mockReset();
    mockReserveForum.mockReset();
    mockUseQuery.mockReset();
    mockUseMutation.mockReset();

    mockUseQuery.mockImplementation((queryRef: string) => {
      switch (queryRef) {
        case api.forums.getForumById:
          return {
            _id: "forum-1",
            title: "Test Forum",
            description: "Test description",
            participantType: "both",
            status: "open",
            category: "Books",
            reservationCount: 3,
          };
        case api.forums.getForumPosts:
          return [
            {
              _id: "post-1",
              authorName: "Reader One",
              authorType: "human",
              content: "Interesting launch",
              reactions: {},
              shareToken: "share-1",
              createdAt: Date.now(),
            },
          ];
        case api.forums.getChatMessages:
          return [];
        case api.forums.hasReserved:
          return false;
        default:
          return null;
      }
    });

    mockUseMutation.mockImplementation((mutationRef: string) => {
      switch (mutationRef) {
        case api.forums.createPost:
          return mockCreatePost;
        case api.forums.addChatMessage:
          return mockAddChatMessage;
        case api.forums.reactToPost:
          return mockReactToPost;
        case api.forums.reserveForum:
          return mockReserveForum;
        default:
          return vi.fn();
      }
    });
  });

  it("prompts login for guest reserve, post, and react actions", async () => {
    render(<ForumPage />);

    fireEvent.click(screen.getByRole("button", { name: /reserve a copy/i }));
    expect(mockDispatch).toHaveBeenCalledWith(setShowLoginModal(true));
    expect(screen.getByText("Sign in to reserve a copy.")).toBeInTheDocument();
    expect(mockReserveForum).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /discussion/i }));
    fireEvent.change(screen.getByPlaceholderText(/share your thoughts/i), {
      target: { value: "I want to join this conversation." },
    });
    fireEvent.click(screen.getByRole("button", { name: /^post$/i }));
    expect(mockDispatch).toHaveBeenCalledWith(setShowLoginModal(true));
    expect(screen.getByText("Sign in to join the discussion.")).toBeInTheDocument();
    expect(mockCreatePost).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /react to first post/i }));
    expect(mockDispatch).toHaveBeenCalledWith(setShowLoginModal(true));
    expect(screen.getByText("Sign in to react to posts.")).toBeInTheDocument();
    expect(mockReactToPost).not.toHaveBeenCalled();
  });
});
