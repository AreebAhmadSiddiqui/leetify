class GitHubService {

    async getConfig() {

        return await chrome.storage.local.get([
            "githubToken",
            "githubOwner",
            "githubRepo"
        ]);
    }


    getExtension(language) {

        const extensions = {

            cpp: "cpp",
            c: "c",
            csharp: "cs",
            java: "java",
            python: "py",
            python3: "py",
            javascript: "js",
            typescript: "ts",
            golang: "go",
            go: "go",
            rust: "rs",
            kotlin: "kt",
            swift: "swift",
            php: "php",
            ruby: "rb",
            scala: "scala",
            dart: "dart",
            elixir: "ex",
            racket: "rkt",
            erlang: "erl",

            "C++": "cpp",
            "C": "c",
            "C#": "cs",
            "Java": "java",
            "Python": "py",
            "Python3": "py",
            "JavaScript": "js",
            "TypeScript": "ts",
            "Go": "go",
            "Rust": "rs",
            "Kotlin": "kt",
            "Swift": "swift",
            "PHP": "php",
            "Ruby": "rb",
            "Scala": "scala",
            "Dart": "dart",
            "Elixir": "ex",
            "Racket": "rkt",
            "Erlang": "erl"
        };

        return extensions[language] || "txt";
    }


    encodeBase64(text) {

        const bytes =
            new TextEncoder().encode(text);

        let binary = "";

        for (
            let i = 0;
            i < bytes.length;
            i += 0x8000
        ) {

            binary += String.fromCharCode(
                ...bytes.subarray(
                    i,
                    i + 0x8000
                )
            );
        }

        return btoa(binary);
    }


    async uploadSolution(solution) {

        const {
            githubToken: token,
            githubOwner: owner,
            githubRepo: repo
        } = await this.getConfig();


        if (!token || !owner || !repo) {
            throw new Error(
                "GitHub is not configured."
            );
        }


        const extension =
            this.getExtension(
                solution.language
            );


        const category =
            solution.isDaily
                ? "Leetcode Daily"
                : "Random Problems";


        const path =
            `${category}/` +
            `${solution.number}-${solution.slug}/` +
            `solution.${extension}`;


        const base =
            `https://api.github.com/repos/` +
            `${encodeURIComponent(owner)}/` +
            `${encodeURIComponent(repo)}/` +
            `contents/${path}`;


        let sha;


        const existing =
            await fetch(
                base,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                        Accept:
                            "application/vnd.github+json"
                    }
                }
            );


        if (existing.ok) {

            sha =
                (await existing.json()).sha;
        }


        const body = {

            message:
                `Add solution: ${solution.number}. ${solution.problem}`,

            content:
                this.encodeBase64(
                    solution.code
                )
        };


        if (sha) {
            body.sha = sha;
        }


        const response =
            await fetch(
                base,
                {
                    method: "PUT",

                    headers: {
                        Authorization:
                            `Bearer ${token}`,

                        Accept:
                            "application/vnd.github+json",

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(body)
                }
            );


        if (!response.ok) {

            throw new Error(
                `GitHub upload failed: ${response.status}`
            );
        }


        return await response.json();
    }
}


const githubService =
    new GitHubService();