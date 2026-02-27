# Open Items — app-next

Last updated: 2026-02-19

## 1. Auth & Infrastructure

| Item               | Status      | File                                         | Details                                           |
| ------------------ | ----------- | -------------------------------------------- | ------------------------------------------------- |
| Avatar upload      | Temporary   | `api/upload-avatar-vercel/route.ts`          | Needs Flask `/image` endpoint for production.     |
| Passkey login      | Placeholder | `api/auth/passkey/login-verify/route.ts:103` | Uses placeholder token. NextAuth handles session. |
| Dashboard redirect | Fixed       | `dashboard/user-dashboard.tsx`               | `/auth/signin` → `/auth/sign-in`                  |

## Extras improvements

### Dataset Edit Form - Markdown Preview

**Current state**: The dataset edit form (`dataset-edit-form.tsx`) has a plain `<Textarea>` for the description field.

**Enhancement opportunity**: The legacy React app (`server/src/client/app/src/pages/auth/DataEdit.js`) includes a nice 2-tab interface for editing descriptions with Markdown:

- **Tab 1 "Description"**: Edit mode with raw Markdown syntax
- **Tab 2 "Preview"**: Rendered preview using `ReactMarkdown`
- Includes a Markdown icon linking to GitHub's Markdown guide

**Implementation**:

- Add tabs component (Edit/Preview) for the description field
- Use `react-markdown` or similar library for preview rendering
- Add Markdown helper icon/link for user guidance
- Consider applying to other multiline text fields (citation, etc.)

**Files affected**:

- `app-next/src/components/dataset/dataset-edit-form.tsx`

**Priority**: Low (nice-to-have UX improvement)
