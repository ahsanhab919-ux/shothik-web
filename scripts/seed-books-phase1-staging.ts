import { mkdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import dotenv from "dotenv";
import {
  attachBookAssetForUser,
  createBookDraft,
  creditWalletPurchase,
  getBookDraftForUser,
  moderateBookForAdmin,
  purchasePublishedBookForUser,
  setPublishedBookPriceForUser,
  submitBookDraftForUser,
  updateBookDraftForUser,
  type BookAssetInput,
} from "@/lib/books/insforge-book-service";
import { insforgeQuery } from "@/lib/insforge-db";

type SeedBookStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "published"
  | "rejected"
  | "unpublished";

type SeedFixture = {
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  category: string;
  subcategory?: string;
  keywords: string[];
  status: SeedBookStatus;
  distributionOptIn?: boolean;
  creditPrice?: number;
  listPrice?: string;
  currency?: string;
  isbn?: string;
  googlePlayUrl?: string;
  rejectionReason?: string;
  rejectionCategory?: string;
  unpublishReason?: string;
  purchaseByReader?: boolean;
};

type SeedUser = {
  label: "creator" | "admin" | "reader";
  email: string;
  password: string;
  name: string;
};

type SeededIdentity = {
  id: string;
  email: string;
  password: string;
  name: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const execFileAsync = promisify(execFile);

dotenv.config({ path: path.join(rootDir, ".env.local") });
dotenv.config({ path: path.join(rootDir, ".env"), override: false });

const linkedProject = JSON.parse(
  readFileSync(path.join(rootDir, ".insforge", "project.json"), "utf8"),
) as {
  oss_host?: string;
  api_key?: string;
};

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL ?? linkedProject.oss_host;
const appUrl =
  process.env.STAGING_APP_URL ??
  process.env.TESTSPRITE_PROJECT_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://staging.shothikgpt.com";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to seed staging books.");
}

if (!baseUrl) {
  throw new Error("An InsForge base URL is required to seed staging books.");
}

const seedUsers: SeedUser[] = [
  {
    label: "creator",
    email: process.env.STAGING_CREATOR_EMAIL ?? "staging.creator+books@shothikgpt.test",
    password: process.env.STAGING_CREATOR_PASSWORD ?? "StagingCreator!123",
    name: "Staging Creator",
  },
  {
    label: "admin",
    email: process.env.STAGING_ADMIN_EMAIL ?? "staging.admin+books@shothikgpt.test",
    password: process.env.STAGING_ADMIN_PASSWORD ?? "StagingAdmin!123",
    name: "Staging Admin",
  },
  {
    label: "reader",
    email: process.env.STAGING_READER_EMAIL ?? "staging.reader+books@shothikgpt.test",
    password: process.env.STAGING_READER_PASSWORD ?? "StagingReader!123",
    name: "Staging Reader",
  },
];

function makeSvgCover(title: string) {
  const escaped = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600">
  <rect width="1200" height="1600" fill="#111827" />
  <rect x="80" y="80" width="1040" height="1440" rx="48" fill="#1f2937" stroke="#60a5fa" stroke-width="8" />
  <text x="600" y="540" font-size="74" text-anchor="middle" fill="#f9fafb" font-family="Arial, sans-serif">Shothik Staging</text>
  <text x="600" y="700" font-size="54" text-anchor="middle" fill="#93c5fd" font-family="Arial, sans-serif">${escaped}</text>
  <text x="600" y="1320" font-size="40" text-anchor="middle" fill="#cbd5e1" font-family="Arial, sans-serif">Representative Phase 1 Seed Cover</text>
</svg>`;
}

function makeManuscriptText(fixture: SeedFixture) {
  return [
    fixture.title,
    fixture.subtitle ?? "",
    "",
    fixture.description,
    "",
    `Category: ${fixture.category}`,
    `Keywords: ${fixture.keywords.join(", ")}`,
    "",
    "This is a deterministic staging manuscript used for full-flow validation.",
    "It exists to exercise creator submission, admin moderation, and reader access paths.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function loadFixtures() {
  const filePath = path.join(rootDir, "scripts", "fixtures", "books-phase1-staging-seed.json");
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as SeedFixture[];
}

async function resolveUserByEmail(email: string) {
  const result = await insforgeQuery<{ id: string }>(
    `
      select id::text as id
      from auth.users
      where lower(email) = lower($1)
      limit 1
    `,
    [email],
  );

  return result.rows[0]?.id ?? null;
}

async function signUpUser(user: SeedUser) {
  const response = await fetch(`${appUrl}/api/auth/sign-up`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      name: user.name,
      redirectTo: `${appUrl}/auth/login`,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = String(payload?.message || payload?.error || "");
    if (!/already|exists|registered/i.test(message)) {
      throw new Error(`Failed to create ${user.label} user: ${message || response.statusText}`);
    }
  }
}

async function ensureUser(user: SeedUser): Promise<SeededIdentity> {
  let id = await resolveUserByEmail(user.email);
  if (!id) {
    await signUpUser(user);
    id = await resolveUserByEmail(user.email);
  }

  if (!id) {
    throw new Error(`Unable to resolve auth user for ${user.email}`);
  }

  return {
    id,
    email: user.email,
    password: user.password,
    name: user.name,
  };
}

async function ensureAdminRole(adminUserId: string) {
  await insforgeQuery(
    `
      insert into public.admin_roles (auth_user_id, role, granted_by)
      values ($1::uuid, 'book_admin', $1::uuid)
      on conflict (auth_user_id, role) do nothing
    `,
    [adminUserId],
  );
}

async function ensureReaderCredits(readerUserId: string, minimumBalance: number) {
  const current = await insforgeQuery<{ balance: number }>(
    `
      select balance
      from public.user_credits
      where auth_user_id = $1::uuid
      limit 1
    `,
    [readerUserId],
  );

  const balance = current.rows[0]?.balance ?? 0;
  if (balance >= minimumBalance) {
    return balance;
  }

  const topUp = minimumBalance - balance;
  await creditWalletPurchase({
    userId: readerUserId,
    amount: topUp,
    providerPaymentId: `staging-seed-reader-topup-${readerUserId}`,
    description: "Seeded reader credits for staging smoke coverage",
    metadata: { source: "scripts/seed-books-phase1-staging.ts" },
  });

  return minimumBalance;
}

async function uploadSeedAsset(args: {
  bucket: "book-manuscripts" | "book-covers";
  objectKey: string;
  filePath: string;
  mimeType: string;
}) {
  await execFileAsync("npx", [
    "@insforge/cli",
    "storage",
    "upload",
    args.filePath,
    "--bucket",
    args.bucket,
    "--key",
    args.objectKey,
    "--content-type",
    args.mimeType,
  ], {
    cwd: rootDir,
  });

  return {
    key: args.objectKey,
    url: `${baseUrl}/api/storage/buckets/${args.bucket}/objects/${encodeURIComponent(args.objectKey)}`,
  };
}

async function ensureDraftBook(fixture: SeedFixture, creatorUserId: string) {
  const existing = await insforgeQuery<{ id: string }>(
    `
      select id::text as id
      from public.books
      where auth_user_id = $1::uuid
        and legacy_convex_id = $2
      limit 1
    `,
    [creatorUserId, `seed:${fixture.slug}`],
  );

  if (existing.rows[0]?.id) {
    return existing.rows[0].id;
  }

  const created = await createBookDraft({
    userId: creatorUserId,
    title: fixture.title,
    legacyProjectId: null,
  });

  await insforgeQuery(
    `update public.books set legacy_convex_id = $2 where id = $1::uuid`,
    [created._id, `seed:${fixture.slug}`],
  );

  return created._id;
}

async function ensureAssets(bookId: string, creatorUserId: string, fixture: SeedFixture) {
  const seedDir = path.join(rootDir, ".tmp-seed-assets");
  await mkdir(seedDir, { recursive: true });

  const manuscriptKey = `${creatorUserId}/${bookId}/seed-manuscript-${fixture.slug}.txt`;
  const coverKey = `${creatorUserId}/${bookId}/seed-cover-${fixture.slug}.svg`;
  const manuscriptPath = path.join(seedDir, `${fixture.slug}-manuscript.txt`);
  const coverPath = path.join(seedDir, `${fixture.slug}-cover.svg`);

  await writeFile(manuscriptPath, makeManuscriptText(fixture), "utf8");
  await writeFile(coverPath, makeSvgCover(fixture.title), "utf8");

  const manuscriptUpload = await uploadSeedAsset({
    bucket: "book-manuscripts",
    objectKey: manuscriptKey,
    filePath: manuscriptPath,
    mimeType: "text/plain",
  });
  const coverUpload = await uploadSeedAsset({
    bucket: "book-covers",
    objectKey: coverKey,
    filePath: coverPath,
    mimeType: "image/svg+xml",
  });

  const manuscriptAsset: BookAssetInput = {
    bucket: "book-manuscripts",
    key: manuscriptUpload.key,
    url: manuscriptUpload.url,
    mimeType: "text/plain",
    byteSize: Buffer.byteLength(makeManuscriptText(fixture), "utf8"),
    metadata: {
      fileName: `${fixture.slug}.txt`,
      format: "TXT",
      source: "seed",
    },
  };

  const coverAsset: BookAssetInput = {
    bucket: "book-covers",
    key: coverUpload.key,
    url: coverUpload.url,
    mimeType: "image/svg+xml",
    byteSize: Buffer.byteLength(makeSvgCover(fixture.title), "utf8"),
    metadata: {
      fileName: `${fixture.slug}.svg`,
      dimensions: { width: 1200, height: 1600 },
      source: "seed",
    },
  };

  await attachBookAssetForUser({
    bookId,
    userId: creatorUserId,
    assetKind: "manuscript",
    asset: manuscriptAsset,
  });
  await attachBookAssetForUser({
    bookId,
    userId: creatorUserId,
    assetKind: "cover",
    asset: coverAsset,
  });
}

async function alignDraft(bookId: string, creatorUserId: string, fixture: SeedFixture) {
  await updateBookDraftForUser({
    bookId,
    userId: creatorUserId,
    updates: {
      title: fixture.title,
      subtitle: fixture.subtitle ?? null,
      description: fixture.description,
      category: fixture.category,
      subcategory: fixture.subcategory ?? null,
      keywords: fixture.keywords,
      distributionOptIn: fixture.distributionOptIn ?? false,
      agreementAccepted: true,
      agreementName: "Staging Seed Agreement",
      agreementScrolled: true,
      currentStep: 5,
      completedSteps: ["details", "content", "cover", "pricing", "review"],
      language: "English",
      listPrice: fixture.listPrice ?? "0.00",
      currency: fixture.currency ?? "USD",
    },
  });
}

async function moveToTargetState(args: {
  fixture: SeedFixture;
  bookId: string;
  creatorUserId: string;
  adminUserId: string;
  adminName: string;
  readerUserId: string;
}) {
  const { fixture, bookId, creatorUserId, adminUserId, adminName, readerUserId } = args;
  let current = await getBookDraftForUser(bookId, creatorUserId);

  if (current.status === "draft" && fixture.status !== "draft") {
    current = await submitBookDraftForUser({
      bookId,
      userId: creatorUserId,
    });
  }

  if (fixture.status === "submitted") {
    return current;
  }

  if (["approved", "published", "unpublished"].includes(fixture.status) && current.status === "submitted") {
    current = await moderateBookForAdmin({
      bookId,
      adminUserId,
      adminLabel: adminName,
      action: {
        action: "approve",
        notes: "Representative staging approval seed.",
        isbn: fixture.isbn,
      },
    });
  }

  if (fixture.status === "rejected" && current.status === "submitted") {
    current = await moderateBookForAdmin({
      bookId,
      adminUserId,
      adminLabel: adminName,
      action: {
        action: "reject",
        reason: fixture.rejectionReason ?? "Representative staging rejection path.",
        category: fixture.rejectionCategory ?? "quality",
        notes: "Representative staging rejection seed.",
      },
    });
    return current;
  }

  if (fixture.status === "published" || fixture.status === "unpublished") {
    if (current.status !== "published") {
      current = await moderateBookForAdmin({
        bookId,
        adminUserId,
        adminLabel: adminName,
        action: {
          action: "publish",
          notes: "Representative staging publish seed.",
          isbn: fixture.isbn,
          googlePlayUrl: fixture.googlePlayUrl,
        },
      });
    }

    await setPublishedBookPriceForUser({
      bookId,
      userId: creatorUserId,
      creditPrice: fixture.creditPrice ?? 0,
    });

    if (fixture.purchaseByReader) {
      await ensureReaderCredits(readerUserId, Math.max(200, fixture.creditPrice ?? 0));
      try {
        await purchasePublishedBookForUser({
          bookId,
          userId: readerUserId,
        });
      } catch (error) {
        if (!(error instanceof Error) || !/already own|already purchased/i.test(error.message)) {
          throw error;
        }
      }
    }

    if (fixture.status === "unpublished") {
      current = await moderateBookForAdmin({
        bookId,
        adminUserId,
        adminLabel: adminName,
        action: {
          action: "unpublish",
          reason: fixture.unpublishReason ?? "Representative staging unpublish path.",
          notes: "Representative staging unpublish seed.",
        },
      });
    }

    return current;
  }

  return current;
}

async function verifyConsistency(creatorUserId: string, readerUserId: string) {
  const result = await insforgeQuery<{
    book_count: string;
    asset_count: string;
    moderation_count: string;
    purchase_count: string;
    library_count: string;
  }>(
    `
      select
        (select count(*)::text from public.books where auth_user_id = $1::uuid and legacy_convex_id like 'seed:%') as book_count,
        (select count(*)::text from public.book_assets a join public.books b on b.id = a.book_id where b.auth_user_id = $1::uuid and b.legacy_convex_id like 'seed:%') as asset_count,
        (select count(*)::text from public.book_moderation_events e join public.books b on b.id = e.book_id where b.auth_user_id = $1::uuid and b.legacy_convex_id like 'seed:%') as moderation_count,
        (select count(*)::text from public.book_purchases where buyer_auth_user_id = $2::uuid) as purchase_count,
        (select count(*)::text from public.book_library_entries where auth_user_id = $2::uuid) as library_count
    `,
    [creatorUserId, readerUserId],
  );

  return {
    bookCount: Number.parseInt(result.rows[0]?.book_count ?? "0", 10),
    assetCount: Number.parseInt(result.rows[0]?.asset_count ?? "0", 10),
    moderationCount: Number.parseInt(result.rows[0]?.moderation_count ?? "0", 10),
    purchaseCount: Number.parseInt(result.rows[0]?.purchase_count ?? "0", 10),
    libraryCount: Number.parseInt(result.rows[0]?.library_count ?? "0", 10),
  };
}

async function main() {
  const fixtures = await loadFixtures();
  const creator = await ensureUser(seedUsers[0]);
  const admin = await ensureUser(seedUsers[1]);
  const reader = await ensureUser(seedUsers[2]);

  await ensureAdminRole(admin.id);
  await ensureReaderCredits(reader.id, 200);

  const seededBooks: Array<{ slug: string; id: string; status: string }> = [];

  for (const fixture of fixtures) {
    const bookId = await ensureDraftBook(fixture, creator.id);
    await ensureAssets(bookId, creator.id, fixture);
    await alignDraft(bookId, creator.id, fixture);
    const finalBook = await moveToTargetState({
      fixture,
      bookId,
      creatorUserId: creator.id,
      adminUserId: admin.id,
      adminName: admin.name,
      readerUserId: reader.id,
    });

    seededBooks.push({
      slug: fixture.slug,
      id: bookId,
      status: finalBook.status,
    });
  }

  const verification = await verifyConsistency(creator.id, reader.id);

  console.log(
    JSON.stringify(
      {
        seededUsers: {
          creator: { id: creator.id, email: creator.email },
          admin: { id: admin.id, email: admin.email },
          reader: { id: reader.id, email: reader.email },
        },
        seededBooks,
        verification,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
