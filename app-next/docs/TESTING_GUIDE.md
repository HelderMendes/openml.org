# OpenML App-Next Testing Guide

This document outlines core testing scenarios for the Next.js frontend (`app-next`). Use this checklist before major releases.

**Base URL:** `http://localhost:3000` (or your local port)

## 1. Backward Compatibility & Redirects

Verify legacy URL structures redirect or load correctly in the new app.

| Test Case        | Legacy URL Example | Expected Outcome                                     |
| :--------------- | :----------------- | :--------------------------------------------------- |
| **Dataset ID**   | `/d/61`            | Loads Dataset 61 details (`/d/61` or `/datasets/61`) |
| **Task ID**      | `/t/59`            | Loads Task 59 details                                |
| **Flow ID**      | `/f/1`             | Loads Flow 1 details                                 |
| **Run ID**       | `/r/1`             | Loads Run 1 details                                  |
| **User Profile** | `/u/1`             | Loads Profile for User 1                             |
| **Measures**     | `/a`               | Loads Measures exploration page                      |

## 2. Authentication & User Profile

Test the complete auth lifecycle.

### Sign Up & Sign In (All 4 Methods)

- [ ] **Method 1: Email/Password**
  - Sign Up at `/auth/register`: Create account.
  - Confirm Email: Click link in simulated email.
  - Log In at `/auth/signin`: Use new credentials.
- [ ] **Method 2: Google OAuth**
  - Click "Sign in with Google".
- [ ] **Method 3: GitHub OAuth**
  - Click "Sign in with GitHub".
- [ ] **Method 4: ORCID / Passkey** (Verify available options)
  - Register Passkey in profile settings.
  - Log Out -> Log In via Passkey.

### Account Management

- [ ] **Reset Password**
  - Go to `/auth/forgot-password`. Request reset link.
  - Click link -> Set new password -> Log in with new password.
- [ ] **Update Profile**
  - Go to `/dashboard/settings`.
  - **Avatar:** Upload a new image (JPG/PNG). Verify navbar update.
  - **Fields:** Change Name/Bio. Save and refresh.

## 3. Search & Exploration

Verify search filters and sorting for all types.

| Type            | URL                      | Test Actions                                     |
| :-------------- | :----------------------- | :----------------------------------------------- |
| **Datasets**    | `/search/type/data`      | Filter: Active status; Sort: Runs; Query: "iris" |
| **Tasks**       | `/search/type/task`      | Filter: Classification; Sort: Date               |
| **Flows**       | `/search/type/flow`      | Query: "sklearn"; Filter: Uploader               |
| **Runs**        | `/search/type/run`       | Filter: Task ID; Sort: Accuracy                  |
| **Collections** | `/search/type/study`     | Query: "benchmark"; Check results                |
| **Benchmarks**  | `/search/type/benchmark` | Search for specific suites                       |

## 4. Creation Flows (CRUD)

Test creating content. _Crucial:_ Validate inputs (empty forms, invalid formats).

### Upload Dataset

**URL:** `/datasets/upload`

- [ ] **Validation:** Submit empty form. Check "Required" errors.
- [ ] **File Format:** Upload `.arff`/`.csv`.
- [ ] **Success:** Upload -> Redirect to new Dataset page.

### Define Task

**URL:** `/tasks/create`

- [ ] **Inputs:** Select Dataset (e.g., `61`), Task Type (`Supervised Classification`).
- [ ] **Validation:** Invalid Dataset ID.
- [ ] **Success:** Create -> Redirect to Task page.

### Create Collection

**URL:** `/collections/create`

- [ ] **Inputs:** Name, Description, List of IDs.
- [ ] **Action:** Add/Remove IDs.
- [ ] **Success:** Publish -> Redirect to Collection page.

## 5. Entity Management & Permissions

### Modify Own Dataset

- [ ] **Navigate:** Your uploaded dataset (e.g., `/d/[your_id]`).
- [ ] **Action:** "Actions Menu" -> "Edit". Change Description.
- [ ] **Verify:** Save -> Check detail page.

### Modify Others' Dataset

- [ ] **Navigate:** Other user's dataset (e.g., `/d/61`).
- [ ] **Check:** "Edit" button hidden/disabled?
- [ ] **Action:** Direct URL access -> Should show Permission Denied.

## 6. Navigation & Entity Menus

Verify structure/menus.

**Dataset Page:** `/d/61` (Iris)

- [ ] **Header:** Title, Version, Uploader, Downloads.
- [ ] **Tabs (Sub-menus):**
  - `Data`: Properties/features.
  - `Tasks`: Related tasks.
  - `Flows`: Related flows.
  - `Runs`: Run list.
  - `Discussions`: Issues.
- [ ] **Actions Menu:** Download, XML, JSON.

**Task Page:** `/t/59`

- [ ] **Tabs:** Overview, Runs, Leaderboard.

## 7. Other Important Tests

- [ ] **Like/Star:** Like a dataset. Refresh page.
- [ ] **API Keys:** Profile -> Regen API Key.
- [ ] **Responsiveness:** Test mobile width (Hamburger menu).
