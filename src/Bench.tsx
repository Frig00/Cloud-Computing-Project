import { useState } from "react";
import { AuthApi, DefaultConfig } from "./api";
import { useAuth } from "./services/authService";
import { Button } from "@mui/material";
import { fetchEventSource } from "@microsoft/fetch-event-source";


export default function Bench() {
    const auth = useAuth();

    const [response, setResponse] = useState<any | null>(null);

    const protectedEndpoint = async () => {
        const authApi = new AuthApi();
        var res = null;
        try {
            res = await authApi.authProtectedGet()
        } catch (e) {
            res = e;
        }
        setResponse(res);
    };

    const testSSE = () => {
        fetch('http://localhost:3000/video/sse')
        fetchEventSource('http://localhost:3000/video/sse', {
            onmessage(ev) {
                console.log(ev.data);
            }
        });
    }

    return (
        <div>
            <h1>Bench</h1><br/>

            <span>token: {auth.token}</span><br/><br/>
            

            <Button onClick={protectedEndpoint}>try protected endpoint</Button><br/><br/>
            <span>{JSON.stringify(response)}</span>


            <br/><br/>

            <Button onClick={testSSE}>test SSE</Button>
        </div>
    );
}
