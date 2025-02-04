import { FastifyInstance } from "fastify";
import { getPrisma } from "../data/prisma";

// Configuration for GitHub OAuth
const config = {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    redirectUri: process.env.CTRL_BASE_URL + '/auth/github/callback',
}

export class GitHubService {

    /**
     * Generate GitHub authentication URL.
     * @returns GitHub authentication URL
     */
    static authenticateWithGitHub() {
        const githubAuthUrl = 'https://github.com/login/oauth/authorize';
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            scope: 'read:user'
        });

        return `${githubAuthUrl}?${params.toString()}`;
    }

    /**
     * Login with GitHub OAuth code.
     * @param code - GitHub OAuth code
     * @param fastify - Fastify instance
     * @returns JWT token
     */
    static async loginWithGitHubCode(code: string, fastify: FastifyInstance) {
        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                code: code
            })
        });

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Fetch user data from GitHub
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        const githubUserData = await userResponse.json();

        // Check if user already exists in the database
        const existingUser = await getPrisma().users.findUnique({
            where: { userId: githubUserData.login },
            include: { githubUsers: true }
        });

        if (existingUser) {
            // User exists, check if they have a GitHub account linked
            if (existingUser.githubUsers && existingUser.githubUsers.githubId == githubUserData.id) {
                return fastify.jwt.sign({ id: existingUser.userId });
            } else {
                throw new Error('User exists but no GitHub account is linked');
            }
        }

        // Create a new user in the database
        const newUser = await getPrisma().users.create({
            data: {
                userId: githubUserData.login,
                name: githubUserData.name,
                password: '',
                profilePictureUrl: githubUserData.avatar_url,
                githubUsers: {
                    create: {
                        githubId: githubUserData.id
                    }
                }
            },
            include: { githubUsers: true }
        });

        return fastify.jwt.sign({ id: newUser.userId });
    }
}