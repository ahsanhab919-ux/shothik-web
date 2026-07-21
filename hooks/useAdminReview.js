"use client";

import { useCallback, useEffect, useState } from "react";

async function requestJson(url, options, fallbackMessage) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || fallbackMessage);
  }
  return payload;
}

function useJsonResource(url) {
  const [data, setData] = useState(undefined);
  const [isLoading, setIsLoading] = useState(Boolean(url));

  useEffect(() => {
    if (!url) {
      setData(undefined);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    requestJson(url, undefined, "Request failed")
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, isLoading };
}

export function useAdminReview() {
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState(null);

  const sendAction = useCallback(async (bookId, body) => {
    setActionLoading(bookId);
    setActionError(null);
    try {
      return await requestJson(
        `/api/admin/books/${bookId}/status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
        "Failed to update book review state.",
      );
    } catch (err) {
      setActionError(err.message);
      throw err;
    } finally {
      setActionLoading(null);
    }
  }, []);

  const startReview = useCallback(async () => {
    return null;
  }, []);

  const approveBook = useCallback(async (bookId, { reviewNotes, isbn } = {}) => {
    return sendAction(bookId, {
      action: "approve",
      notes: reviewNotes,
      isbn,
    });
  }, [sendAction]);

  const rejectBook = useCallback(async (bookId, { rejectionReason, rejectionCategory, reviewNotes } = {}) => {
    return sendAction(bookId, {
      action: "reject",
      reason: rejectionReason,
      category: rejectionCategory,
      notes: reviewNotes,
    });
  }, [sendAction]);

  const markPublished = useCallback(async (bookId, { googlePlayUrl, isbn } = {}) => {
    return sendAction(bookId, {
      action: "publish",
      googlePlayUrl,
      isbn,
    });
  }, [sendAction]);

  return {
    startReview,
    approveBook,
    rejectBook,
    markPublished,
    actionLoading,
    actionError,
  };
}

export function useAdminBooks(status) {
  const searchParams = new URLSearchParams();
  if (status) {
    searchParams.set("status", status);
  }
  const queryString = searchParams.toString();
  const { data, isLoading } = useJsonResource(
    `/api/admin/books${queryString ? `?${queryString}` : ""}`,
  );

  return {
    books: data?.books || [],
    isLoading,
  };
}

export function useAdminStats() {
  const { data, isLoading } = useJsonResource("/api/admin/books/stats");
  return {
    stats: data?.stats || { submitted: 0, inReview: 0, approved: 0, published: 0, rejected: 0, total: 0 },
    isLoading,
  };
}

export function useAdminBookDetail(bookId) {
  const { data, isLoading } = useJsonResource(
    bookId ? `/api/books/drafts/${bookId}` : null,
  );
  return {
    book: data?.book || null,
    isLoading,
  };
}
