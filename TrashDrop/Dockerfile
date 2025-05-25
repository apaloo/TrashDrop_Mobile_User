FROM node:16-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Set environment variables to production
ENV NODE_ENV=production

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["node", "server.js"]

cd /Users/otisa.apaloo/CascadeProjects/TrashDrop_Mobile_User/TrashDrop
docker build -t trashdrop .

docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e SESSION_SECRET=your-session-secret \
  -e JWT_SECRET=your-jwt-secret \
  -e SUPABASE_URL=your-supabase-url \
  -e SUPABASE_KEY=your-supabase-key \
  -e SUPABASE_ANON_KEY=your-supabase-anon-key \
  -e SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key \
  trashdrop
