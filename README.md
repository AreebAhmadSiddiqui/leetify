# Leetify

Leetify is a Chrome extension that automatically saves your **accepted LeetCode solutions to GitHub**.

The goal is simple:

> Submit a LeetCode problem → Leetify gets the accepted solution → pushes it to your GitHub repository.

Currently, Leetify focuses on the core workflow. Additional features such as README generation, problem descriptions, tags, test cases, and AI-powered explanations can be added later.

---

## ✨ Current Features

- Detects when you click the **Submit** button on LeetCode.
- Identifies the current problem directly from the LeetCode URL.
- Fetches problem metadata using LeetCode GraphQL.
- Caches problem information in memory for the lifetime of the page, with automatic retry if a lookup fails.
- Detects the new submission by comparing submission IDs, so it does not depend on your system clock.
- Waits for LeetCode to finish processing the submission.
- Detects whether the submission was accepted.
- Retrieves the submitted source code and programming language.
- Automatically pushes the solution to GitHub.
- Supports multiple programming languages.
- Organizes solutions into separate folders for Daily and Random problems, decided at the moment you submit.

---

## 📁 GitHub Repository Structure

Leetify creates the following structure in your configured repository:

```text
|── Leetcode Daily/
│   ├── 678-valid-parenthesis-string/
│   │   └── solution.cpp
│   └── ...
│
├── Random Problems/
│   ├── 2221-check-if-a-parentheses-string-can-be-valid/
│   │   └── solution.cpp
│   └── ...
│
└── README.md
```

The solution path is generated using:

```text
<Category>/<problem-number>-<problem-slug>/solution.<extension>
```

For example:

```text
Leetcode Daily/678-valid-parenthesis-string/solution.cpp
```

### How Daily vs Random is decided

A solution goes into `Leetcode Daily/` when the problem page URL contains `envType=daily-question`, which is the case when you open the problem through LeetCode's daily challenge link. Otherwise it goes into `Random Problems/`.

This is checked when you click Submit, not when the problem is first loaded, so opening the same problem both ways is handled correctly.

---

## 🧱 Project Structure

```text
Leetify/
├── assets/
│   └── icon.png
│
├── background/
│   └── background.js
│
├── content/
│   ├── problemDetails.js
│   ├── solutionGetter.js
│   └── submissionChecker.js
│
├── github/
│   └── github.js
│
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
│
└── manifest.json
```

### Content script load order

The content scripts share functions as globals, so the order in `manifest.json` matters. `problemDetails.js` and `solutionGetter.js` must be listed **before** `submissionChecker.js`:

```json
"content_scripts": [
  {
    "matches": ["https://leetcode.com/*"],
    "js": [
      "content/problemDetails.js",
      "content/solutionGetter.js",
      "content/submissionChecker.js"
    ]
  }
]
```

### `problemDetails.js`

Responsible for:

- Extracting the problem slug from the current URL (`getSlug`).
- Fetching problem details from LeetCode GraphQL (`getProblem`).
- Caching problem details in memory, retrying on the next call if a fetch fails.
- Detecting whether the page was opened through the daily challenge (`isDailyChallenge`).

The cached information includes:

```text
number
problem
slug
difficulty
```

`isDaily` is not cached. It is calculated at submit time.

### `submissionChecker.js`

Responsible for:

- Detecting clicks on the LeetCode Submit button.
- Recording the newest existing submission before you submit, to use as a baseline.
- Polling for a new submission (a different ID than the baseline) until it reaches a final state.
- Checking whether the submission was accepted.
- Building the solution object and passing it to the background service worker.

### `solutionGetter.js`

Responsible for retrieving:

```text
source code
programming language
```

for a specific submission.

### `background.js`

Receives accepted solutions from the content script and sends them to the GitHub service.

### `github.js`

Responsible for:

- Reading GitHub configuration.
- Creating the correct repository path.
- Encoding the solution.
- Creating/updating files through the GitHub API.

### `popup/`

Provides the configuration UI for:

```text
GitHub Owner
GitHub Repository
GitHub Token
```

---

# 🚀 Setup

## 1. Clone or download the project

Download the Leetify project to your computer.

You should have the project folder containing:

```text
manifest.json
background/
content/
github/
popup/
assets/
```

---

## 2. Create a GitHub repository

Create a repository where you want your LeetCode solutions to be stored.

For example:

```text
DSA-Prep-2
```

---

## 3. Create a GitHub access token

Leetify uses the GitHub API to create and update solution files.

Create a GitHub token that has permission to **read and write repository contents** for the repository you want Leetify to use.

Keep the token private.

Do not commit the token into this project.

---

## 4. Load Leetify into Chrome

Open:

```text
chrome://extensions
```

Enable:

```text
Developer mode
```

Then click:

```text
Load unpacked
```

Select the **Leetify project folder** containing `manifest.json`.

---

## 5. Configure GitHub

Click the Leetify extension icon.

Enter:

```text
GitHub Owner
GitHub Repository
GitHub Token
```

For example:

```text
Owner: AreebAhmadSiddiqui
Repository: DSA-Prep
Token: <your GitHub token>
```

Click:

```text
Save & Test
```

Leetify will verify that the GitHub repository can be accessed.

---

# 🧪 Using Leetify

Once the extension is installed and configured:

### 1. Open a LeetCode problem

For example:

```text
https://leetcode.com/problems/two-sum/
```

Leetify extracts:

```text
two-sum
```

from the URL and fetches the problem information.

### 2. Solve the problem

Write your solution normally.

### 3. Click Submit

Leetify detects the Submit button and notes the latest existing submission for the problem.

It then polls LeetCode until a new submission appears and finishes processing.

> Only clicking the **Submit** button is detected. Keyboard shortcuts are not.

### 4. If the submission is accepted

Leetify retrieves the submitted code and sends it to the background service worker.

### 5. GitHub upload

The solution is automatically uploaded to the configured repository.

Example:

```text
Leetcode Daily/1-two-sum/solution.cpp
```

or:

```text
Random Problems/1-two-sum/solution.cpp
```

depending on how you opened the problem.

If a solution for the same problem and language already exists, it is updated in place.

---

# 🔐 Storage

## `chrome.storage.local`

Used for persistent configuration:

```text
githubOwner
githubRepo
githubToken
```

## In-memory problem cache

Problem information fetched from LeetCode is kept in a `Map` inside the content script, keyed by problem slug:

```js
{
    "two-sum": {
        number: 1,
        problem: "Two Sum",
        slug: "two-sum",
        difficulty: "Easy"
    }
}
```

This cache lives only as long as the LeetCode tab, so nothing about problems is written to Chrome storage and nothing appears under **Application → Extension storage** in DevTools.

---

# 🔄 How It Works

```text
                 LeetCode
                    │
                    ▼
             Problem URL
                    │
                    ▼
          problemDetails.js
                    │
                    ▼
            GraphQL request
                    │
                    ▼
            In-memory cache
                    │
                    │
             User clicks
               Submit
                    │
                    ▼
        submissionChecker.js
                    │
                    ▼
      Record baseline submission ID
                    │
                    ▼
     Poll until a new submission
          reaches a final state
                    │
                    ▼
              Accepted?
               /       \
             No         Yes
             │           │
             ▼           ▼
           Stop    solutionGetter.js
                         │
                         ▼
                    Source code
                         │
                         ▼
                    background.js
                         │
                         ▼
                      github.js
                         │
                         ▼
                      GitHub
```

---

# 🛠️ Development

After modifying extension files:

1. Open `chrome://extensions`
2. Find **Leetify**
3. Click **Reload**
4. Refresh the LeetCode tab

For background/service-worker changes, reload the extension before testing.

Useful debugging locations:

### Content scripts

Open LeetCode → `F12` → **Console**

You should see logs such as:

```text
[Leetify] Submission checker started
[Leetify] Fetching problem: ...
[Leetify] ✅ Problem cached: ...
[Leetify] Baseline submission id: ...
[Leetify] 🚀 Submission detected: ...
[Leetify] ✅ Solution: ...
```

### Background service worker

Open:

```text
chrome://extensions
```

Then open:

```text
Service worker → Inspect
```

You should see:

```text
[Leetify] 🚀 Pushed to GitHub
```

or a `GitHub upload failed` error with a status code.

---

# 🩺 Troubleshooting

| Symptom | Things to check |
|---|---|
| No `Submission checker started` log | Content scripts aren't loading. Check `matches` in `manifest.json`, then reload the extension and the LeetCode tab. |
| `ReferenceError: getSlug is not defined` (or `getProblem`, `getSolution`) | Wrong script order in `manifest.json`. See [Content script load order](#content-script-load-order). |
| `Submission detected` appears but nothing is pushed | Look for a `❌ Error` line in the page console (for example "Submission not found"), then check the service worker console. |
| `GitHub is not configured` | Open the popup and save the owner, repository and token. |
| `GitHub upload failed: 401` / `403` / `404` | Token is invalid, lacks contents read/write permission, or the owner/repository is wrong. |
| Wrong folder (Daily vs Random) | Open the problem through the daily challenge link so the URL contains `envType=daily-question`. |
| Not logged in | Leetify needs an active LeetCode session to read your submissions. |

---

# 🌱 Future Improvements

The current version intentionally keeps the implementation small.

Potential future features:

- Generate a `README.md` for every problem.
- Store the full problem description.
- Store examples and test cases.
- Store LeetCode topic tags.
- Generate time and space complexity explanations.
- Detect and explain similar previously solved problems.
- AI-generated solution explanations.
- AI-generated approach and reasoning.
- Detect submissions made with keyboard shortcuts.
- Support additional GitHub repository configurations.
- Improve duplicate/update handling (for example, "Update" commit messages and richer error details).
- Add a richer extension popup/dashboard.

The architecture is intentionally separated so these features can be added without rewriting the core submission flow.

---

## ⚠️ Notes

- Leetify relies on LeetCode's GraphQL endpoints. These are not a stable public API and may change.
- The extension requires the user to be logged into LeetCode.
- The GitHub token should never be committed to the repository.
- Leetify currently uploads accepted solutions only.
- If LeetCode changes its UI or GraphQL schema, parts of the extension may need to be updated.

---

## 📜 License

Add your preferred license here.