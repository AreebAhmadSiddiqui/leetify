importScripts("../github/github.js");

chrome.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS"
});

chrome.runtime.onMessage.addListener(
    message => {
        if (message.type !== "SUBMISSION_ACCEPTED") {
            return;
        }

        githubService
            .uploadSolution(message.solution)
            .then(() =>
                console.log(
                    "[Leetify] 🚀 Pushed to GitHub"
                )
            )
            .catch(error =>
                console.error(
                    "[Leetify] ❌ GitHub upload failed:",
                    error
                )
            );
    }
);