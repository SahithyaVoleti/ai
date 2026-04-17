# Stage 1: Building the app
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the Next.js app
# In production, we need the API URL at build time if it's baked into static pages
# We skip lint during build to speed up CI/CD if it was already checked
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 2: Run the app
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Only copy necessary files for runtime
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Expose the port Next.js runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
