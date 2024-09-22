# Source: https://pnpm.io/docker

FROM node:18-alpine AS base

# Set pnpm environment variables
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Enable corepack for pnpm
RUN corepack enable

# Set the working directory
WORKDIR /app

# Copy all files from the current directory to /app in the container
COPY . .

# Install only production dependencies
FROM base AS prod-deps
# Use the cache for pnpm store to speed up installation
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

# Build the application
FROM base AS build
# Install all dependencies (including dev dependencies) and build the app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

# Final production stage
FROM base
# Copy over the node_modules from the production dependencies stage
COPY --from=prod-deps /app/node_modules /app/node_modules
# Copy over the built files from the build stage
COPY --from=build /app/.next /app/.next

# Expose port 3000 for the application
EXPOSE 3000

# Start the application using pnpm
CMD [ "pnpm", "start" ]