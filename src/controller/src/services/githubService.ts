import { FastifyInstance } from "fastify";
import prisma from "../data/prisma";

const config = {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    redirectUri: process.env.CTRL_BASE_URL + '/auth/github/callback',
}


export class GitHubService {

    static authenticateWithGitHub() {
        const githubAuthUrl = 'https://github.com/login/oauth/authorize';
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            scope: 'read:user'
        });

        return `${githubAuthUrl}?${params.toString()}`;
    }

    static async loginWithGitHubCode(code: string, fastify: FastifyInstance) {
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

        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        const githubUserData = await userResponse.json();

        const existingUser = await prisma.users.findUnique({
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

        const newUser = await prisma.users.create({
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
