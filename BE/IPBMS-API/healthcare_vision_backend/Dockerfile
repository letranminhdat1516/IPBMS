# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app
ENV TZ=Asia/Ho_Chi_Minh
# System deps (prisma/alpine thường cần)
RUN apk add --no-cache libc6-compat openssl tzdata && \
	cp /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime && \
	echo "Asia/Ho_Chi_Minh" > /etc/timezone && \
	apk del tzdata

# Dùng pnpm qua corepack
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

# Chỉ copy file manifest để cache install
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client nếu có, sau đó đảm bảo thư mục .prisma luôn tồn tại
RUN pnpm prisma generate 

# Build NestJS -> ./dist
RUN pnpm run build

# Thay thế các phụ thuộc dev bằng cài đặt chỉ dành cho production để giảm kích thước node_modules
# Cài lại chỉ các phụ thuộc production sau khi build (an toàn hơn và thường nhỏ hơn prune)
ENV NODE_ENV=production
# Skip prepare scripts during production install to avoid husky dependency issues
ENV npm_config_ignore_scripts=true
# Remove existing node_modules (installed with dev deps) then reinstall only prod deps
RUN rm -rf node_modules
RUN pnpm install --frozen-lockfile --prod --no-optional
# Đảm bảo các file runtime của Prisma client được sinh ra trong node_modules cho @prisma/client
# Sử dụng pnpm dlx để không cần cài prisma vào dependencies ở môi trường production
RUN pnpm dlx prisma generate --schema=./prisma/schema.prisma || pnpm dlx prisma generate

# ---------- Runtime stage ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production 
ENV NODE_OPTIONS=--dns-result-order=ipv4first
ENV TZ=Asia/Ho_Chi_Minh

# System deps cho runtime (prisma runtime)
RUN apk add --no-cache libc6-compat openssl tzdata && \
	cp /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime && \
	echo "Asia/Ho_Chi_Minh" > /etc/timezone && \
	apk del tzdata

# Copy code đã build và deps đã prune
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src/config/firebase ./dist/src/config/firebase
COPY package.json ./
COPY .env ./.env

EXPOSE 3010

# Quyền ít đặc quyền hơn (tùy bạn)
USER node

CMD ["node", "dist/src/main.js"]

