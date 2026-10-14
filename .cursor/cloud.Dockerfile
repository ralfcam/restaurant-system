# Cloud Agent image with Docker-in-VM so Supabase local and Playwright can run.
# Docker recipe: https://cursor.com/docs/cloud-agent/setup#running-docker
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    git \
    sudo \
    unzip \
    && rm -rf /var/lib/apt/lists/*

RUN install -m 0755 -d /etc/apt/keyrings && \
    curl --retry 3 --retry-delay 5 -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y \
    docker-ce=5:28.5.2-1~ubuntu.24.04~noble \
    docker-ce-cli=5:28.5.2-1~ubuntu.24.04~noble \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y fuse-overlayfs && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /etc/docker && \
    printf '%s\n' '{' \
    '  "storage-driver": "fuse-overlayfs"' \
    '}' > /etc/docker/daemon.json
RUN apt-get update && apt-get install -y iptables && rm -rf /var/lib/apt/lists/*
RUN update-alternatives --set iptables /usr/sbin/iptables-legacy && \
    update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy

RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list && \
    apt-get update && apt-get install -y gh && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    corepack enable && \
    rm -rf /var/lib/apt/lists/*

# Playwright Chromium system libraries (Ubuntu 24.04 t64 names).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libnspr4 \
    libatk1.0-0t64 \
    libatk-bridge2.0-0t64 \
    libcups2t64 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libatspi2.0-0t64 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2t64 \
    libpango-1.0-0 \
    libcairo2 \
    libx11-6 \
    libxext6 \
    libxcb1 \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/ssh/sshd_config.d && echo 'PasswordAuthentication no\nChallengeResponseAuthentication no\nUsePAM no' > /etc/ssh/sshd_config.d/disable_password_auth.conf
RUN id -u ubuntu >/dev/null 2>&1 || useradd -m -s /bin/bash ubuntu
RUN groupadd -f docker && usermod -aG docker ubuntu
RUN usermod -aG sudo ubuntu
RUN echo "ubuntu ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/ubuntu
RUN echo "ubuntu:ubuntu" | chpasswd

USER ubuntu
WORKDIR /workspace

# CodeRabbit CLI pin matches PINNED_CLI_VERSION / the /push gate (0.9.0, no
# leading v). Auth stays runtime-only via CODERABBIT_API_KEY — do not bake a
# key into the image.
# 0.9.0 publishes SHA256SUMS.sig; this image still installs the linux-x64 zip
# and verifies the published SHA256SUMS hash so Cloud setup stays installer-free.
ENV CI=1
ENV CODERABBIT_VERSION=0.9.0
ENV PATH="/home/ubuntu/.local/bin:${PATH}"
RUN mkdir -p /home/ubuntu/.local/bin /tmp/cr && \
    curl -fsSL https://cli.coderabbit.ai/releases/0.9.0/coderabbit-linux-x64.zip \
      -o /tmp/cr/coderabbit-linux-x64.zip && \
    echo "56e4c99de9d11106c3e6bf31034864db8f746cb97c9eaf9470adcfa6461da66f  /tmp/cr/coderabbit-linux-x64.zip" \
      | sha256sum -c - && \
    unzip -o /tmp/cr/coderabbit-linux-x64.zip -d /tmp/cr && \
    install -m 0755 /tmp/cr/coderabbit /home/ubuntu/.local/bin/coderabbit && \
    ln -sfn /home/ubuntu/.local/bin/coderabbit /home/ubuntu/.local/bin/cr && \
    test "$(coderabbit --version 2>/dev/null | tr -d '[:space:]' | sed 's/^v//')" = "0.9.0" && \
    rm -rf /tmp/cr
