"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getInsforgeBrowserClient } from "@/lib/insforge/client";

function buildApiError(payload, fallback) {
  if (payload && typeof payload === "object") {
    return payload.message || payload.error || fallback;
  }
  return fallback;
}

async function requestJson(url, options, fallbackMessage) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(buildApiError(payload, fallbackMessage));
  }
  return payload;
}

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
}

export function usePublishingBook({
  bookId: existingBookId,
  initialTitle = "",
  userId = "",
  projectId = null,
}) {
  const [bookId, setBookId] = useState(existingBookId || null);
  const [book, setBook] = useState(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const saveTimeoutRef = useRef(null);

  const ensureBookDraft = useCallback(async () => {
    if (bookId) return bookId;
    const data = await requestJson(
      "/api/books/drafts",
      {
        method: "POST",
        body: JSON.stringify({
          title: initialTitle || "Untitled Book",
          projectId,
        }),
      },
      "Failed to create draft",
    );
    const newId = data.book?._id;
    if (!newId) {
      throw new Error("Failed to create draft");
    }
    setBook(data.book);
    setBookId(newId);
    return newId;
  }, [bookId, initialTitle, projectId]);

  const refreshBook = useCallback(async (id) => {
    const data = await requestJson(
      `/api/books/drafts/${id}`,
      { method: "GET", headers: {} },
      "Failed to load draft",
    );
    setBook(data.book);
    return data.book;
  }, []);

  useEffect(() => {
    if (!bookId) {
      setBook(undefined);
      return;
    }

    let cancelled = false;
    refreshBook(bookId)
      .then((loadedBook) => {
        if (!cancelled) {
          setBook(loadedBook);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSaveError(error.message || "Failed to load draft");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bookId, refreshBook]);

  const saveDraft = useCallback(
    async (updates) => {
      setSaveError(null);
      setIsSaving(true);
      try {
        const id = await ensureBookDraft();
        const data = await requestJson(
          `/api/books/drafts/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              updates,
            }),
          },
          "Failed to save draft",
        );
        setBook(data.book);
      } catch (err) {
        setSaveError(err.message || "Failed to save draft");
        console.error("Save draft error:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [ensureBookDraft]
  );

  const debouncedSave = useCallback(
    (updates) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveDraft(updates), 800);
    },
    [saveDraft]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const uploadManuscript = useCallback(
    async (file) => {
      if (!userId) {
        throw new Error("Authenticated user id is required for upload");
      }

      setIsSaving(true);
      setSaveError(null);
      try {
        const id = await ensureBookDraft();
        const storage = getInsforgeBrowserClient().storage.from("book-manuscripts");
        const format = file.name.toLowerCase().endsWith(".epub") ? "EPUB" : "PDF";
        const key = `${userId}/${id}/manuscript-${Date.now()}-${sanitizeFileName(file.name)}`;
        const { data, error } = await storage.upload(key, file);
        if (error) throw error;
        if (!data?.key || !data?.url) throw new Error("Upload failed");

        const response = await requestJson(
          `/api/books/drafts/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              manuscriptAsset: {
                bucket: "book-manuscripts",
                key: data.key,
                url: data.url,
                mimeType: file.type || "application/octet-stream",
                byteSize: file.size,
                metadata: {
                  fileName: file.name,
                  format,
                },
              },
            }),
          },
          "Failed to save manuscript metadata",
        );

        setBook(response.book);
        return { storageId: data.key, fileName: file.name, fileSize: file.size, format };
      } catch (err) {
        setSaveError(err.message || "Failed to upload manuscript");
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [ensureBookDraft, userId]
  );

  const uploadCover = useCallback(
    async (file, dimensions) => {
      if (!userId) {
        throw new Error("Authenticated user id is required for upload");
      }

      setIsSaving(true);
      setSaveError(null);
      try {
        const id = await ensureBookDraft();
        const storage = getInsforgeBrowserClient().storage.from("book-covers");
        const key = `${userId}/${id}/cover-${Date.now()}-${sanitizeFileName(file.name)}`;
        const { data, error } = await storage.upload(key, file);
        if (error) throw error;
        if (!data?.key || !data?.url) throw new Error("Upload failed");

        const response = await requestJson(
          `/api/books/drafts/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              coverAsset: {
                bucket: "book-covers",
                key: data.key,
                url: data.url,
                mimeType: file.type || "application/octet-stream",
                byteSize: file.size,
                metadata: {
                  fileName: file.name,
                  dimensions,
                },
              },
            }),
          },
          "Failed to save cover metadata",
        );

        setBook(response.book);
        return { storageId: data.key };
      } catch (err) {
        setSaveError(err.message || "Failed to upload cover");
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [ensureBookDraft, userId]
  );

  const submit = useCallback(async () => {
    if (!bookId) throw new Error("No book to submit");
    setSaveError(null);
    try {
      const data = await requestJson(
        `/api/books/drafts/${bookId}/submit`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
        "Submission failed",
      );
      setBook(data.book);
      return true;
    } catch (err) {
      setSaveError(err.message || "Submission failed");
      throw err;
    }
  }, [bookId]);

  const resubmit = useCallback(async () => {
    if (!bookId) throw new Error("No book to resubmit");
    setSaveError(null);
    try {
      const data = await requestJson(
        `/api/books/drafts/${bookId}/submit`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
        "Resubmission failed",
      );
      setBook(data.book);
      return true;
    } catch (err) {
      setSaveError(err.message || "Resubmission failed");
      throw err;
    }
  }, [bookId]);

  return {
    bookId,
    book,
    isSaving,
    saveError,
    saveDraft,
    debouncedSave,
    uploadManuscript,
    uploadCover,
    submit,
    resubmit,
    ensureBookDraft,
  };
}

export function useAuthorBooks() {
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    requestJson("/api/books/drafts", { method: "GET", headers: {} }, "Failed to load books")
      .then((data) => {
        if (!cancelled) {
          setBooks(data.books || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBooks([]);
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
  }, []);

  return {
    books,
    isLoading,
  };
}
