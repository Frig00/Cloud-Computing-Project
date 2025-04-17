# Sunomi: A Cloud-Native Video Sharing Platform

[![Build Docker images and push to ECR](https://github.com/ferraridavide/cloud/actions/workflows/build_to_ecr.yml/badge.svg)](https://github.com/ferraridavide/cloud/actions/workflows/build_to_ecr.yml)
[![Deploy frontend to S3 and GitHub Pages](https://github.com/ferraridavide/sunomi/actions/workflows/build_frontend.yml/badge.svg?branch=main)](https://github.com/ferraridavide/sunomi/actions/workflows/build_frontend.yml)


Sunomi is a cloud-native video sharing platform, designed and built as a project for the Cloud Computing course at the University of Pavia.  It mirrors the core functionalities of popular video-sharing services, enabling users to upload, share, and interact with video content, while leveraging the power and scalability of Amazon Web Services (AWS).  This project demonstrates a deep understanding of cloud computing best practices, microservices architecture, serverless technologies, and DevOps principles.

![Homepage screenshot](https://github.com/user-attachments/assets/e4cf899c-65ec-4d3b-81cd-31dd8028429f)

[Read the full technical report here!](docs/sunomi-final-report.pdf)

## Architecture
![image](https://github.com/user-attachments/assets/09d5b0e3-400b-47cb-8a40-4c8a57c27819)


Sunomi is built on a microservices architecture, deployed on AWS. Key components include:

*   **Frontend:** A single-page application (SPA) built with React and TypeScript, using Vite for development and bundling.  Hosted on S3 and served via CloudFront.
*   **Controller:**  The backend API, built with Node.js and Fastify.  Provides RESTful endpoints for all platform functionalities.  Deployed on ECS Fargate.
*   **Transcoder:**  Responsible for transcoding uploaded videos into multiple HLS streams.  Implemented in Python using FFmpeg.  Deployed as on-demand ECS Fargate tasks triggered by S3 events and managed by Lambda and SNS.
*   **Database:**  MySQL database hosted on AWS RDS (Aurora MySQL in production, single instance in development).  Uses Prisma ORM for database interactions.
*   **Object Storage:**  Amazon S3 for storing video files, thumbnails, and transcriptions.  MinIO is used for local development.
*   **Event-Driven Communication:**  AWS SNS (Simple Notification Service) and AWS Lambda are used for asynchronous communication and event-driven workflows.
*   **API Gateway:**  Managed WebSocket API for real-time updates.
*   **CloudFront:**  CDN for efficient content delivery of videos and the frontend application.
*   **Other AWS Services:**  Rekognition (content moderation), Transcribe (speech-to-text), Route 53 (DNS), Certificate Manager (SSL/TLS), Secrets Manager (secrets management), DynamoDB (WebSocket connection management).

## Technologies

*   **Frontend:** React, TypeScript, Vite, Material UI, React Query, React Router, OpenAPI Generator
*   **Backend:** Node.js, Fastify, Prisma, JWT, OpenAPI (Swagger)
*   **Transcoder:** Python, FFmpeg, boto3, python-ffmpeg
*   **Database:** MySQL, AWS RDS (Aurora MySQL)
*   **Object Storage:** Amazon S3, MinIO
*   **Infrastructure:** Terraform, AWS (ECS, Fargate, Lambda, SNS, S3, CloudFront, API Gateway, RDS, DynamoDB, Rekognition, Transcribe, Route 53, Certificate Manager, Secrets Manager)
*   **CI/CD:** GitHub Actions
*   **Local Development:** Docker, Docker Compose, RabbitMQ
