# Base runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 10000

# Install Microsoft ODBC SQL Server Driver (for SQL connectivity)
RUN apt-get update && \
    apt-get install -y curl apt-transport-https software-properties-common gnupg && \
    curl -sSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg && \
    install -o root -g root -m 644 microsoft.gpg /usr/share/keyrings/ && \
    sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/mssql-release.list' && \
    apt-get update && \
    ACCEPT_EULA=Y apt-get install -y msodbcsql18 unixodbc-dev && \
    rm -f microsoft.gpg && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["Backend.csproj", "./"]
RUN dotnet restore "Backend.csproj"
COPY . .
RUN dotnet build "Backend.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "Backend.csproj" -c Release -o /app/publish

# Final stage
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENV ASPNETCORE_URLS=http://+:10000
ENTRYPOINT ["dotnet", "Backend.dll"]
