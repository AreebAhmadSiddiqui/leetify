// NOTE: In manifest.json, list this file BEFORE submissionChecker.js
// (and solutionGetter.js) in content_scripts.js, because they share
// these globals: getSlug, getProblem, isDailyChallenge.

// In-memory cache: slug -> Promise<problem | null>.
// Storing the promise also dedupes concurrent requests for the same slug.
const problemCache = new Map();

// Get the problem slug from the current LeetCode URL
function getSlug() {
  const parts = location.pathname.split("/").filter(Boolean);

  // We only care about LeetCode problem pages
  if (parts[0] !== "problems") {
    return null;
  }

  return parts[1] || null;
}

// Whether the user reached this problem through the daily challenge.
// Evaluated at submit time (not cached), because the same problem can
// be opened both normally and via the daily link.
function isDailyChallenge() {
  return (
    new URLSearchParams(location.search).get("envType") === "daily-question"
  );
}

// Fetch basic problem details from the LeetCode GraphQL API
async function fetchProblem(slug) {
  console.log("[Leetify] Fetching problem:", slug);

  const query = {
    operationName: "questionData",

    variables: {
      titleSlug: slug,
    },

    query: `
      query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionFrontendId
          title
          titleSlug
          difficulty
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
  const question = data?.data?.question;

  if (!question) {
    throw new Error("LeetCode did not return a problem");
  }

  const problem = {
    number: Number(question.questionFrontendId),
    problem: question.title,
    slug: question.titleSlug,
    difficulty: question.difficulty,
  };

  console.log("[Leetify] ✅ Problem cached:", problem);

  return problem;
}

// Get a problem, using the cache when possible.
// Failed lookups are removed from the cache so the next call retries.
function getProblem(slug) {
  if (problemCache.has(slug)) {
    return problemCache.get(slug);
  }

  const request = fetchProblem(slug).catch((error) => {
    console.error("[Leetify] Could not fetch problem:", slug, error);
    problemCache.delete(slug);
    return null;
  });

  problemCache.set(slug, request);

  return request;
}

// Warm the cache for the page we landed on.
// No polling needed: submissionChecker calls getProblem(slug) at submit
// time, which hits the cache or fetches (and retries) if needed.
{
  const slug = getSlug();

  if (slug) {
    getProblem(slug);
  }
}
