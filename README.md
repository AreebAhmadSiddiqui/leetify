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
- Temporarily caches problem information using `chrome.storage.session`.
- Waits for LeetCode to finish processing the submission.
- Detects whether the submission was accepted.
- Retrieves the submitted source code and programming language.
- Automatically pushes the solution to GitHub.
- Supports multiple programming languages.
- Organizes solutions into separate folders for Daily and Random problems.

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

### `problemDetails.js`

Responsible for:

- Extracting the problem slug from the current URL.
- Fetching problem details from LeetCode GraphQL.
- Caching problem details in `chrome.storage.session`.

The current cached information includes:

```text
number
problem
slug
difficulty
isDaily
```

### `submissionChecker.js`

Responsible for:

- Detecting the LeetCode Submit button.
- Finding the latest submission for the current problem.
- Waiting for the submission to reach a final state.
- Checking whether the submission was accepted.
- Passing the accepted solution to the background service worker.

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

Leetify detects the Submit button.

It then checks LeetCode for the newly created submission.

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

depending on the problem category.

---

# 🔐 Storage

Leetify uses two different types of Chrome storage.

## `chrome.storage.local`

Used for persistent configuration:

```text
githubOwner
githubRepo
githubToken
```

## `chrome.storage.session`

Used for temporary LeetCode problem information.

Example:

```js
{
    problems: {
        "two-sum": {
            number: 1,
            problem: "Two Sum",
            slug: "two-sum",
            difficulty: "Easy",
            isDaily: false
        }
    }
}
```

Problem information is not intended to be permanently stored in local extension storage.

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
           Session cache
                    │
                    │
             User clicks
               Submit
                    │
                    ▼
        submissionChecker.js
                    │
                    ▼
          Latest submission
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
[Leetify] Problem cached: ...
[Leetify] Submission checker started
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
- Better SPA navigation handling.
- Support additional GitHub repository configurations.
- Improve duplicate/update handling.
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
