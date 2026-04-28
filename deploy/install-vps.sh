#!/usr/bin/env bash
# =============================================================================
# Paperclip VN — VPS Install Script
# =============================================================================
# Hỗ trợ: Ubuntu 22.04+ / Debian 12+
# Yêu cầu: Chạy với quyền root hoặc sudo
#
# Cách dùng:
#   curl -fsSL https://raw.githubusercontent.com/saucevn/paperclip-vn/main/deploy/install-vps.sh | bash
#   # hoặc
#   bash deploy/install-vps.sh
#
# Sau khi chạy:
#   1. Điền thông tin vào /opt/paperclip/.env.production
#   2. docker compose -f /opt/paperclip/docker-compose.production.yml --env-file /opt/paperclip/.env.production up -d
#   3. Lấy admin invite URL: docker compose -f ... logs server | grep "bootstrap"

set -euo pipefail

PAPERCLIP_DIR="/opt/paperclip"
REPO_URL="https://github.com/saucevn/paperclip-vn"
IMAGE="ghcr.io/saucevn/paperclip-vn:slim"

# --- Màu sắc ---
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     Paperclip VN — VPS Installer         ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# --- Kiểm tra OS ---
if [[ ! -f /etc/os-release ]]; then
    error "Không nhận diện được hệ điều hành. Chỉ hỗ trợ Ubuntu/Debian."
fi
source /etc/os-release
if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
    warn "Hệ điều hành: $PRETTY_NAME — chưa được test đầy đủ."
fi

# --- Kiểm tra quyền root ---
if [[ $EUID -ne 0 ]]; then
    error "Vui lòng chạy script với quyền root: sudo bash $0"
fi

# --- Cài Docker ---
if ! command -v docker &>/dev/null; then
    info "Cài đặt Docker..."
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg lsb-release
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/${ID}/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/${ID} $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable --now docker
    success "Docker đã được cài đặt."
else
    success "Docker đã có sẵn: $(docker --version)"
fi

# --- Tạo thư mục ---
info "Tạo thư mục $PAPERCLIP_DIR ..."
mkdir -p "$PAPERCLIP_DIR"

# --- Tải file cấu hình ---
info "Tải docker-compose.production.yml và .env.production.example ..."
curl -fsSL "$REPO_URL/raw/main/docker/docker-compose.production.yml" \
    -o "$PAPERCLIP_DIR/docker-compose.production.yml"
curl -fsSL "$REPO_URL/raw/main/.env.production.example" \
    -o "$PAPERCLIP_DIR/.env.production.example"

# --- Sinh secrets tự động ---
ENV_FILE="$PAPERCLIP_DIR/.env.production"
if [[ ! -f "$ENV_FILE" ]]; then
    info "Tạo file .env.production với secrets tự động..."
    cp "$PAPERCLIP_DIR/.env.production.example" "$ENV_FILE"

    # Sinh BETTER_AUTH_SECRET
    AUTH_SECRET=$(openssl rand -hex 32)
    sed -i "s/^BETTER_AUTH_SECRET=$/BETTER_AUTH_SECRET=$AUTH_SECRET/" "$ENV_FILE"

    # Sinh DB_PASSWORD
    DB_PASS=$(openssl rand -hex 16)
    sed -i "s/^DB_PASSWORD=$/DB_PASSWORD=$DB_PASS/" "$ENV_FILE"

    # Sinh PAPERCLIP_AGENT_JWT_SECRET
    JWT_SECRET=$(openssl rand -hex 32)
    sed -i "s/^PAPERCLIP_AGENT_JWT_SECRET=$/PAPERCLIP_AGENT_JWT_SECRET=$JWT_SECRET/" "$ENV_FILE"

    success "Đã tạo .env.production với secrets tự động."
    warn "Hãy điền PAPERCLIP_PUBLIC_URL và API keys vào $ENV_FILE trước khi chạy!"
else
    warn ".env.production đã tồn tại — bỏ qua bước tạo."
fi

# --- Cài nginx (tùy chọn) ---
read -r -p "Cài nginx và cấu hình reverse proxy? [y/N] " INSTALL_NGINX
if [[ "$INSTALL_NGINX" =~ ^[Yy]$ ]]; then
    apt-get install -y -qq nginx
    read -r -p "Nhập domain của bạn (ví dụ: paperclip.example.com): " DOMAIN
    curl -fsSL "$REPO_URL/raw/main/deploy/nginx/paperclip.conf" \
        | sed "s/paperclip.example.com/$DOMAIN/g" \
        > "/etc/nginx/sites-available/paperclip"
    ln -sf /etc/nginx/sites-available/paperclip /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
    # Cập nhật PAPERCLIP_PUBLIC_URL
    sed -i "s|^PAPERCLIP_PUBLIC_URL=.*|PAPERCLIP_PUBLIC_URL=https://$DOMAIN|" "$ENV_FILE"

    # Cài certbot SSL
    if command -v certbot &>/dev/null || apt-get install -y -qq certbot python3-certbot-nginx; then
        read -r -p "Email cho Let's Encrypt SSL: " LE_EMAIL
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$LE_EMAIL" || \
            warn "Certbot thất bại — hãy chạy thủ công: certbot --nginx -d $DOMAIN"
    fi
    success "Nginx đã được cấu hình cho $DOMAIN."
fi

# --- Pull Docker image ---
info "Pull image $IMAGE ..."
docker pull "$IMAGE" || warn "Không pull được image — sẽ build local khi chạy compose."

# --- Hướng dẫn tiếp theo ---
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Cài đặt hoàn tất! Các bước tiếp theo:                      ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  1. Mở và điền các biến còn lại:                            ║"
echo "║     nano $ENV_FILE"
echo "║     (bắt buộc: PAPERCLIP_PUBLIC_URL, ANTHROPIC_API_KEY)     ║"
echo "║                                                              ║"
echo "║  2. Khởi động:                                               ║"
echo "║     cd $PAPERCLIP_DIR"
echo "║     docker compose -f docker-compose.production.yml \\       ║"
echo "║       --env-file .env.production up -d                      ║"
echo "║                                                              ║"
echo "║  3. Lấy admin invite URL:                                    ║"
echo "║     docker compose ... logs server | grep -i bootstrap       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
