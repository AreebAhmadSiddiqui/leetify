// Depends on globals from other content scripts, which must load first:
//   problemDetails.js  -> getSlug, getProblem, isDailyChallenge
//   solutionGetter.js  -> getSolution

const FINAL_STATUSES = [
  "Accepted",
  "Wrong Answer",
  "Runtime Error",
  "Compile Error",
  "Memory Limit Exceeded",
  "Time Limit Exceeded",
  "Output Limit Exceeded",
];

const POLL_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 1000;

class SubmissionChecker {
  constructor() {
    // Prevent multiple submission checks from running at once
    this.submitting = false;

    // slug -> id of the newest submission we have already seen
    this.lastSeenId = {};
  }

  start() {
    // Capture phase, because LeetCode's UI is dynamic
    document.addEventListener("click", (e) => this.handleClick(e), true);

    console.log("[Leetify] Submission checker started");
  }

  handleClick(event) {
    const button = event.target.closest("button");

    if (!button) {
      return;
    }

    const text = button.innerText?.trim().toLowerCase();
    const locator = button.getAttribute("data-e2e-locator");

    // Exact match, so buttons like "Submit feedback" don't trigger this
    if (text === "submit" || locator === "console-submit-button") {
      this.submit();
    }
  }

  async submit() {
    if (this.submitting) {
      return;
    }

    const slug = getSlug();

    if (!slug) {
      return;
    }

    this.submitting = true;

    try {
      // Start the baseline lookup right away so it is sent before
      // (or alongside) LeetCode's own submit request.
      const baselinePromise = this.getBaselineId(slug);

      const problem = await getProblem(slug);

      if (!problem) {
        throw new Error("Could not load problem details.");
      }

      const baselineId = await baselinePromise;

      console.log("[Leetify] 🚀 Submission detected:", problem);

      const submission = await this.waitForSubmission(slug, baselineId);

      if (!submission) {
        throw new Error("Submission not found.");
      }

      this.lastSeenId[slug] = submission.id;

      if (submission.status !== "Accepted") {
        console.log("[Leetify] Submission:", submission.status);
        return;
      }

      const details = await getSolution(submission.id);

      if (!details?.code) {
        throw new Error("Could not retrieve submitted code.");
      }

      const solution = {
        ...problem,
        isDaily: isDailyChallenge(),
        language: details.lang?.name,
        code: details.code,
        timestamp: Date.now(),
      };

      console.log("[Leetify] ✅ Solution:", solution);

      chrome.runtime.sendMessage({
        type: "SUBMISSION_ACCEPTED",
        solution,
      });
    } catch (error) {
      console.error("[Leetify] ❌ Error:", error);
    } finally {
      this.submitting = false;
    }
  }

  // The id of the newest submission that existed BEFORE this submit.
  // Comparing ids avoids relying on the user's system clock.
  async getBaselineId(slug) {
    if (slug in this.lastSeenId) {
      return this.lastSeenId[slug];
    }

    try {
      const latest = await this.getLatestSubmission(slug);

      if (!latest) {
        return null;
      }

      // If the latest submission is still being judged, it is the one we
      // just made (our lookup raced LeetCode's request), so there is no
      // earlier submission to use as a baseline.
      const baselineId = FINAL_STATUSES.includes(latest.statusDisplay)
        ? latest.id
        : null;

      console.log("[Leetify] Baseline submission id:", baselineId);

      return baselineId;
    } catch (error) {
      console.error("[Leetify] Could not read baseline submission:", error);
      return null;
    }
  }

  async waitForSubmission(slug, baselineId) {
    for (let i = 0; i < POLL_ATTEMPTS; i++) {
      try {
        const submission = await this.getLatestSubmission(slug);

        // A different id than the baseline means it's our new submission
        if (
          submission &&
          submission.id !== baselineId &&
          FINAL_STATUSES.includes(submission.statusDisplay)
        ) {
          return {
            id: submission.id,
            status: submission.statusDisplay,
          };
        }
      } catch (error) {
        // Transient network error: keep polling
        console.warn("[Leetify] Poll failed, retrying:", error);
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    return null;
  }

  async getLatestSubmission(slug) {
    const query = {
      operationName: "Submissions",

      variables: {
        offset: 0,
        limit: 1,
        lastKey: null,
        questionSlug: slug,
      },

      query: `
        query Submissions(
          $offset: Int!,
          $limit: Int!,
          $lastKey: String,
          $questionSlug: String!
        ) {
          submissionList(
            offset: $offset,
            limit: $limit,
            lastKey: $lastKey,
            questionSlug: $questionSlug
          ) {
            submissions {
              id
              statusDisplay
              timestamp
            }
          }
        }
      `,
    };

    const response = await fetch("https://leetcode.com/graphql/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      throw new Error(`LeetCode responded with ${response.status}`);
    }

    const data = await response.json();

    return data?.data?.submissionList?.submissions?.[0] || null;
  }
}

// Start watching for submissions
new SubmissionChecker().start();