import { useEffect, useState } from "react";
import { createHarbingerClient } from "@harbinger/sdk";

// The site is deliberately just another API consumer: same SDK, same
// public surface a third-party client would use.
const client = createHarbingerClient(
    import.meta.env.VITE_API_URL
        ? { baseUrl: import.meta.env.VITE_API_URL }
        : {},
);

type Status =
    | { state: "loading" }
    | { state: "ok"; serverTime: string }
    | { state: "error" };

export function App() {
    const [status, setStatus] = useState<Status>({ state: "loading" });

    useEffect(() => {
        client.GET("/status").then(
            ({ data }) =>
                setStatus(
                    data
                        ? { state: "ok", serverTime: data.serverTime }
                        : { state: "error" },
                ),
            () => setStatus({ state: "error" }),
        );
    }, []);

    return (
        <main>
            <h1>harbinger</h1>
            <p className="status">
                {status.state === "loading" && "reaching the server…"}
                {status.state === "ok" && `server time ${status.serverTime}`}
                {status.state === "error" && "the server is unreachable"}
            </p>
            <a href="https://api.harbinger.sh/docs">API documentation</a>
        </main>
    );
}
