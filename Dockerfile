# Source: https://pnpm.io/docker

FROM node:18-slim AS base

# Set pnpm environment variables
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Enable corepack for pnpm
RUN corepack enable

# Set the working directory
WORKDIR /app

# Copy only package.json and pnpm-lock.yaml to leverage caching
COPY package.json pnpm-lock.yaml ./

# Install production dependencies first to cache them
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

# Install all dependencies and build the app
FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

# Final stage: production image
FROM node:18-slim AS production

# Set pnpm environment variables again in the final stage
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Copy only the built app and production dependencies
WORKDIR /app
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/.next /app/.next
COPY package.json ./

# Expose port 3000 for the application
EXPOSE 3000

# Start the application using pnpm
CMD [ "pnpm", "start" ]