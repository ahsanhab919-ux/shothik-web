import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const dispatch = vi.fn();
const logoutAuth = vi.fn();
const useSelectorMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

vi.mock("react-redux", () => ({
  useDispatch: () => dispatch,
  useSelector: (selector) =>
    useSelectorMock(selector),
}));

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/redux/slices/auth", () => ({
  logout: () => ({ type: "auth/logout" }),
  setShowLoginModal: (value) => ({ type: "auth/setShowLoginModal", payload: value }),
  setShowRegisterModal: (value) => ({ type: "auth/setShowRegisterModal", payload: value }),
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }) => <div>{children}</div>,
  PopoverTrigger: ({ children }) => <div>{children}</div>,
  PopoverContent: ({ children }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }) => <div>{children}</div>,
  AvatarImage: (props) => <img alt={props.alt} src={props.src} />,
  AvatarFallback: ({ children }) => <div>{children}</div>,
}));

import AccountPopover from "@/components/partials/header/AccountPopover";

describe("AccountPopover", () => {
  beforeEach(() => {
    push.mockReset();
    dispatch.mockReset();
    logoutAuth.mockReset();
    useAuthMock.mockReset();
    useSelectorMock.mockImplementation((selector) =>
      selector({
        auth: {
          accessToken: null,
          user: {},
        },
      }),
    );
    useAuthMock.mockReturnValue({
      user: null,
      isAuthenticated: false,
      logout: logoutAuth,
    });
  });

  it("shows Login / Sign up when no authenticated user is present", () => {
    render(<AccountPopover />);

    expect(screen.getByText("Login / Sign up")).toBeInTheDocument();
    expect(screen.queryByText("Log out")).not.toBeInTheDocument();
  });

  it("prefers the auth context user over empty legacy auth state", () => {
    useAuthMock.mockReturnValue({
      user: {
        email: "writer@example.com",
        name: "Writer Example",
      },
      isAuthenticated: true,
      logout: logoutAuth,
    });

    render(<AccountPopover />);

    expect(screen.getByText("My Profile")).toBeInTheDocument();
    expect(screen.getByText(/writer@example/)).toBeInTheDocument();
    expect(screen.getByText("Log out")).toBeInTheDocument();
    expect(screen.queryByText("Login / Sign up")).not.toBeInTheDocument();
  });
});
