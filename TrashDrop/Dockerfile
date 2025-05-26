FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create a non-root user to run the application
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Create log directory and set permissions
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app

# Bundle app source
COPY --chown=appuser:appgroup . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port the app runs on
EXPOSE 3000

# Switch to non-root user
USER appuser

# Healthcheck to verify the application is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Command to run the application
CMD ["node", "server.js"]
