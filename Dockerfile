# ──────────────────────────────────────────────────────────────────────────────
# Stage 1: Build
# ──────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src

# Copy csproj files and restore (layer caching)
COPY ["src/Hampiee.API/Hampiee.API.csproj", "src/Hampiee.API/"]
COPY ["src/Hampiee.Application/Hampiee.Application.csproj", "src/Hampiee.Application/"]
COPY ["src/Hampiee.Domain/Hampiee.Domain.csproj", "src/Hampiee.Domain/"]
COPY ["src/Hampiee.Infrastructure/Hampiee.Infrastructure.csproj", "src/Hampiee.Infrastructure/"]
RUN dotnet restore "src/Hampiee.API/Hampiee.API.csproj"

# Copy source and build
COPY . .
RUN dotnet build "src/Hampiee.API/Hampiee.API.csproj" -c Release -o /app/build

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2: Publish
# ──────────────────────────────────────────────────────────────────────────────
FROM build AS publish
RUN dotnet publish "src/Hampiee.API/Hampiee.API.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore \
    -r linux-x64 \
    --self-contained false

# ──────────────────────────────────────────────────────────────────────────────
# Stage 3: Runtime (minimal ASP.NET image)
# ──────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS final
WORKDIR /app

# Security: don't run as root
RUN addgroup -S hampiee && adduser -S hampiee -G hampiee
USER hampiee

COPY --from=publish /app/publish .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost:8080/health || exit 1

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "Hampiee.API.dll"]
