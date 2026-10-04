// Get the actual submitted solution
// using the submission ID returned by LeetCode
async function getSolution(id) {

    // GraphQL query to get submitted code
    // and the programming language
    const query = {

        operationName:
            "submissionDetails",

        variables: {
            submissionId:
                Number(id)
        },

        query: `
            query submissionDetails(
                $submissionId: Int!
            ) {
                submissionDetails(
                    submissionId:
                        $submissionId
                ) {
                    code

                    lang {
                        name
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


    // Return the submitted code and language
    return (
        data?.data?.submissionDetails
        || null
    );
}