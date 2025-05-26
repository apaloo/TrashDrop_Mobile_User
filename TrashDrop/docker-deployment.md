# TrashDrop Docker Deployment Guide

This guide explains how to build and deploy the TrashDrop application using Docker.

## Prerequisites

- Docker installed on your deployment machine
- Docker Compose installed (for simplified deployment)
- Access to Supabase credentials for your project

## Files Created for Deployment

1. **Dockerfile**: Defines how to build the TrashDrop container
2. **.dockerignore**: Specifies which files to exclude from the Docker build
3. **docker-compose.yml**: Orchestrates the container deployment with environment variables
4. **.env.example**: Template for required environment variables

## Deployment Steps

### Option 1: Using Docker Compose (Recommended)

1. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file with your actual credentials:
   ```
   SESSION_SECRET=your-actual-session-secret
   JWT_SECRET=your-actual-jwt-secret
   SUPABASE_URL=your-actual-supabase-url
   SUPABASE_KEY=your-actual-supabase-key
   SUPABASE_ANON_KEY=your-actual-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-actual-supabase-service-role-key
   ```

3. Build and start the application:
   ```bash
   docker-compose up -d
   ```

4. The application will be available at http://localhost:3000

### Option 2: Using Docker Directly

1. Build the Docker image:
   ```bash
   docker build -t trashdrop .
   ```

2. Run the container with environment variables:
   ```bash
   docker run -p 3000:3000 \
     -e NODE_ENV=production \
     -e SESSION_SECRET=your-actual-session-secret \
     -e JWT_SECRET=your-actual-jwt-secret \
     -e SUPABASE_URL=your-actual-supabase-url \
     -e SUPABASE_KEY=your-actual-supabase-key \
     -e SUPABASE_ANON_KEY=your-actual-supabase-anon-key \
     -e SUPABASE_SERVICE_ROLE_KEY=your-actual-supabase-service-role-key \
     trashdrop
   ```

## Deployment to Cloud Services

### Deploying to AWS

1. Install and configure AWS CLI
2. Build and tag the image:
   ```bash
   docker build -t trashdrop .
   docker tag trashdrop:latest [your-aws-account-id].dkr.ecr.[region].amazonaws.com/trashdrop:latest
   ```

3. Push to ECR:
   ```bash
   aws ecr get-login-password --region [region] | docker login --username AWS --password-stdin [your-aws-account-id].dkr.ecr.[region].amazonaws.com
   docker push [your-aws-account-id].dkr.ecr.[region].amazonaws.com/trashdrop:latest
   ```

4. Deploy using ECS, EKS, or as a standalone EC2 instance running Docker

### Deploying to Digital Ocean

1. Create a Digital Ocean App Platform project
2. Connect your GitHub repository
3. Deploy the project with the following settings:
   - Dockerfile location: `/Dockerfile`
   - HTTP Port: 3000
   - Add environment variables from your `.env` file

## Troubleshooting

1. **Container fails to start**: Check the logs with `docker logs [container-id]`
2. **Connection to Supabase fails**: Verify your environment variables are correctly set
3. **Application loads but shows errors**: Ensure all required services are accessible from the container

## Maintenance

- Update the application: `docker-compose down && docker-compose up -d --build`
- View logs: `docker-compose logs -f`
- Stop the application: `docker-compose down`
