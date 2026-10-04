class SubmissionChecker {

    constructor() {

        // Prevent multiple submission
        // checks from running at the same time
        this.submitting = false;
    }


    start() {

        // Listen for clicks anywhere on the page.
        // Capture phase is used because LeetCode
        // has a dynamic UI.
        document.addEventListener(
            "click",
            event =>
                this.handleClick(event),
            true
        );


        console.log(
            "[Leetify] Submission checker started"
        );
    }


    handleClick(event) {

        // Find the button that was clicked
        const button =
            event.target.closest("button");


        if (!button) {
            return;
        }


        // Get the button text
        const text =
            button.innerText
                ?.trim()
                .toLowerCase();


        // Detect the LeetCode Submit button
        if (
            text === "submit" ||
            text?.includes("submit")
        ) {

            this.submit();
        }
    }


    async submit() {

        // Ignore duplicate submit events
        if (this.submitting) {
            return;
        }


        // Get the current problem slug
        const slug =
            getSlug();


        if (!slug) {
            return;
        }


        this.submitting = true;


        try {

            // Problem details should already have
            // been cached by problemDetails.js
            const result =
                await chrome.storage.session
                    .get("problems");


            const problem =
                result.problems?.[slug];


            if (!problem) {

                throw new Error(
                    "Problem is not cached."
                );
            }


            // Record the time when the user clicked Submit.
            // This helps us distinguish the new submission
            // from an older submission.
            const startedAt =
                Math.floor(
                    Date.now() / 1000
                );


            console.log(
                "[Leetify] 🚀 Submission detected:",
                problem
            );


            // Wait until LeetCode finishes processing
            // the new submission
            const submission =
                await this.waitForSubmission(
                    slug,
                    startedAt
                );


            if (!submission) {

                throw new Error(
                    "Submission not found."
                );
            }


            // We only want accepted submissions
            if (
                submission.status !==
                "Accepted"
            ) {

                console.log(
                    "[Leetify] Submission:",
                    submission.status
                );

                return;
            }


            // Get the actual submitted code
            const details =
                await getSolution(
                    submission.id
                );


            if (!details?.code) {

                throw new Error(
                    "Could not retrieve submitted code."
                );
            }


            // Combine problem information
            // with the submitted solution
            const solution = {

                ...problem,

                language:
                    details.lang?.name,

                code:
                    details.code,

                timestamp:
                    Date.now()
            };


            console.log(
                "[Leetify] ✅ Solution:",
                solution
            );


            // Send the completed solution
            // to the background service worker
            chrome.runtime.sendMessage({

                type:
                    "SUBMISSION_ACCEPTED",

                solution
            });


        } catch (error) {

            console.error(
                "[Leetify] ❌ Error:",
                error
            );


        } finally {

            // Allow another submission to be detected
            this.submitting = false;
        }
    }


    async waitForSubmission(
        slug,
        startedAt
    ) {

        // Check for the new submission
        // for up to 15 seconds
        for (
            let i = 0;
            i < 15;
            i++
        ) {

            const submission =
                await this.getLatestSubmission(
                    slug
                );


            if (submission) {

                const timestamp =
                    Number(
                        submission.timestamp
                    );


                // These are the final states
                // that mean LeetCode finished processing
                const finished =
                    [
                        "Accepted",
                        "Wrong Answer",
                        "Runtime Error",
                        "Compile Error",
                        "Memory Limit Exceeded",
                        "Time Limit Exceeded"
                    ].includes(
                        submission.statusDisplay
                    );


                // Make sure this is the submission
                // created after we clicked Submit
                if (
                    timestamp >=
                        startedAt - 2 &&
                    finished
                ) {

                    return {

                        id:
                            submission.id,

                        status:
                            submission.statusDisplay
                    };
                }
            }


            // Wait one second before checking again
            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        1000
                    )
            );
        }


        // Submission was not found
        return null;
    }


    async getLatestSubmission(slug) {

        // GraphQL query to get the latest
        // submission for this problem
        const query = {

            operationName:
                "Submissions",

            variables: {

                offset: 0,

                limit: 1,

                lastKey: null,

                questionSlug:
                    slug
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
            `
        };


        // Send request to LeetCode
        const response =
            await fetch(
                "https://leetcode.com/graphql/",
                {
                    method: "POST",

                    credentials: "include",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(query)
                }
            );


        const data =
            await response.json();


        // Return the latest submission
        return (
            data?.data?.submissionList
                ?.submissions?.[0]
            || null
        );
    }
}


// Start watching for submissions
new SubmissionChecker().start();