// Get the problem slug from the current LeetCode URL
function getSlug() {
  const parts = location.pathname.split("/").filter(Boolean);

  // We only care about LeetCode problem pages
  if (parts[0] !== "problems") {
    return null;
  }

  return parts[1] || null;
}

// Fetch problem details from LeetCode GraphQL
// and store them in session storage
async function getProblem(slug) {
  // First check if we already have this problem cached
  const result = await chrome.storage.session.get("problems");

  const problems = result.problems || {};

  // If problem already exists in cache,
  // there is no need to make another GraphQL request
  if (problems[slug]) {
    console.log("[Leetify] Problem already cached:", slug);

    return problems[slug];
  }

  console.log("[Leetify] Fetching problem:", slug);

  // GraphQL query to get basic problem information
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

                content

                exampleTestcases

                topicTags {
                    name
                    slug
                }

                hints

                isPaidOnly
            }
        }
    `,
  };

  // Send request to LeetCode
  const response = await fetch("https://leetcode.com/graphql/", {
    method: "POST",

    credentials: "include",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(query),
  });

  const data = await response.json();

  const question = data?.data?.question;

  // Stop if LeetCode did not return a problem
  if (!question) {
    console.error("[Leetify] Could not fetch problem:", slug);

    return null;
  }

  // Create the object that we want to keep in cache
  const problem = {
    number: Number(question.questionFrontendId),

    problem: question.title,

    slug: question.titleSlug,

    difficulty: question.difficulty,

    isDaily:
      new URLSearchParams(location.search).get("envType") === "daily-question",
  };

  // Store the problem using its slug as the key
  problems[slug] = problem;

  // Save the updated problem cache
  await chrome.storage.session.set({
    problems,
  });

  console.log("[Leetify] ✅ Problem cached:", problem);

  return problem;
}

// Keep track of the last URL/slug that we processed
let lastSlug = null;

// Check the current URL and make sure
// the problem is present in the cache
async function checkProblem() {
  const slug = getSlug();

  // Not a problem page
  if (!slug) {
    return;
  }

  // We already processed this problem
  // and don't need to check again
  if (slug === lastSlug) {
    return;
  }

  lastSlug = slug;

  // Fetch the problem only if it isn't
  // already present in session storage
  await getProblem(slug);
}

// Initial check when the content script starts
checkProblem();

// LeetCode uses client-side navigation,
// so the content script does not necessarily
// reload when the URL changes.
//
// We periodically check the URL so that
// navigating between problems/sub-pages
// is handled automatically.
setInterval(checkProblem, 500);
