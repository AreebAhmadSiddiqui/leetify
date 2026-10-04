const ownerInput = document.getElementById("owner");
const repoInput = document.getElementById("repo");
const tokenInput = document.getElementById("token");

const saveBtn = document.getElementById("saveBtn");
const status = document.getElementById("status");

// ------------------------------------
// LOAD SAVED CONFIG
// ------------------------------------

async function loadConfig() {
  const result = await chrome.storage.local.get([
    "githubOwner",
    "githubRepo",
    "githubToken",
  ]);

  ownerInput.value = result.githubOwner || "";
  repoInput.value = result.githubRepo || "";
  tokenInput.value = result.githubToken || "";
}

// ------------------------------------
// TEST GITHUB ACCESS
// ------------------------------------

async function testGitHubAccess(owner, repo, token) {
  const url =
    `https://api.github.com/repos/` +
    `${encodeURIComponent(owner)}/` +
    `${encodeURIComponent(repo)}`;

  const response = await fetch(url, {
    method: "GET",

    headers: {
      Accept: "application/vnd.github+json",

      Authorization: `Bearer ${token}`,

      "X-GitHub-Api-Version": "2026-03-10",
    },
  });

  if (!response.ok) {
    let errorMessage;

    try {
      const error = await response.json();
      errorMessage = error.message;
    } catch {
      errorMessage = "Unknown GitHub error.";
    }

    throw new Error(`GitHub returned ${response.status}: ${errorMessage}`);
  }

  return await response.json();
}

// ------------------------------------
// SAVE + TEST
// ------------------------------------

saveBtn.addEventListener("click", async () => {
  const owner = ownerInput.value.trim();

  const repo = repoInput.value.trim();

  const token = tokenInput.value.trim();

  // -----------------------------
  // VALIDATION
  // -----------------------------

  if (!owner || !repo || !token) {
    status.textContent = "Please fill all fields.";

    status.className = "error";

    return;
  }

  // -----------------------------
  // UI
  // -----------------------------

  saveBtn.disabled = true;
  saveBtn.textContent = "Testing...";

  status.textContent = "Checking GitHub access...";

  status.className = "";

  try {
    const repository = await testGitHubAccess(owner, repo, token);

    // -----------------------------
    // SAVE CONFIG
    // -----------------------------

    await chrome.storage.local.set({
      githubOwner: owner,
      githubRepo: repo,
      githubToken: token,
    });

    // -----------------------------
    // SUCCESS
    // -----------------------------

    status.textContent = `Connected to ${repository.full_name}`;

    status.className = "success";
  } catch (error) {
    console.error("[Leetify] GitHub connection failed:", error);

    status.textContent = error.message;

    status.className = "error";
  } finally {
    saveBtn.disabled = false;

    saveBtn.textContent = "Save & Test";
  }
});

// ------------------------------------
// INIT
// ------------------------------------

loadConfig();
