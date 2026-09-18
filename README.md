# TTPQ Links

Ứng dụng chia sẻ liên kết riêng cho `ttpq.hatbuinho.me`, xây bằng SvelteKit, TailwindCSS, Drizzle ORM và PostgreSQL.

## URL

- `/` — client page chính.
- `/p/[slug]` — các client page khác.
- `/admin` — quản trị page builder.
- `/login` — đăng nhập quản trị.
- `/health` — health check app + PostgreSQL.

## Phát triển local

Yêu cầu Node 22. Project có `.nvmrc`, vì vậy có thể chạy `nvm use` trước khi cài package.

```bash
npm install
npm run dev
```

Biến môi trường mẫu nằm ở `.env.example`. File `.env` thật không được commit.

## Database

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

`db:seed` tạo trang chính nếu chưa có. Nếu database chưa có admin, script tạo một mật khẩu ngẫu nhiên và lưu vào `.admin-credentials` với quyền file `0600`. File này đã được gitignore.

## Page builder

Admin có thể tạo/nhân bản/xóa page, chuyển draft/published, đặt page làm trang chính, sửa logo/theme, upload background, thêm block `link`, `heading`, `text`, `divider`, kéo thả thứ tự và xem preview tức thời. Ảnh nền có điểm lấy nét kéo-thả, lớp phủ tăng tương phản và tự tạo biến thể WebP cho mobile. Mỗi link block có preview chia sẻ, URL `/share/[blockId]` với Open Graph riêng và ảnh PNG 1200×630 tạo từ logo/ảnh block cùng tiêu đề. Link public sử dụng URL đích trực tiếp và gửi tracking nền qua `/track/[blockId]`; `/go/[blockId]` chỉ dùng cho landing share.

Ảnh logo và background được lưu trên MinIO/S3-compatible storage. Luồng upload giống project `mq`: admin xin presigned PUT URL từ server, browser upload file trực tiếp lên MinIO, sau đó app chỉ lưu public URL vào PostgreSQL. Khi upload background dạng JPG, PNG hoặc WEBP, browser nén thành WebP tối đa 1920 px và tạo thêm bản 1080 px cho màn hình nhỏ; GIF được giữ nguyên để bảo toàn animation. Presigned URL hết hạn sau 5 phút; JPG, PNG, WEBP và GIF được hỗ trợ với giới hạn 8 MB.

Các biến môi trường cần cấu hình:

```txt
MINIO_ENDPOINT
MINIO_ACCESS_KEY
MINIO_SECRET_KEY
MINIO_BUCKET
MINIO_REGION
MINIO_USE_SSL
MINIO_PUBLIC_BASE_URL
```

`MINIO_ENDPOINT` phải truy cập được từ trình duyệt vì presigned PUT URL trỏ trực tiếp tới endpoint này. Bucket cần cho phép public `GET` đối với ảnh đã upload và CORS `PUT` từ origin của web, ví dụ `https://ttpq.hatbuinho.me`. Production nên dùng `MINIO_USE_SSL=true`.

## Production với Vercel

Project tự dùng `@sveltejs/adapter-vercel` khi Vercel cung cấp biến `VERCEL`. Thêm `DATABASE_URL`, các biến `MINIO_*` và các biến admin cần thiết trong Vercel Project Settings trước khi deploy. Ảnh không đi qua filesystem hoặc body upload của Vercel Function; browser PUT trực tiếp lên MinIO.

## Production với Docker + Nginx Proxy Manager

Server dùng external Docker network `nginx_network`, là network chung với Nginx Proxy Manager. App không publish port `3000` ra host; NPM truy cập trực tiếp container qua network này.

Khi chạy bằng Docker, project dùng `@sveltejs/adapter-node`. Sau khi `.env` có `DATABASE_URL`, các biến `MINIO_*`, `ORIGIN=https://ttpq.hatbuinho.me`, `HOST=0.0.0.0`, `PORT=3000`:

```bash
docker network inspect nginx_network
docker compose build
docker compose up -d
```

Trong Nginx Proxy Manager tạo **Proxy Host**:

- Domain Names: `ttpq.hatbuinho.me`
- Scheme: `http`
- Forward Hostname / IP: `ttpq-links`
- Forward Port: `3000`
- SSL: cấp Let's Encrypt certificate và bật Force SSL

Health check sau khi proxy hoạt động:

```bash
curl https://ttpq.hatbuinho.me/health
```

Trước mỗi lần deploy có thay đổi schema:

```bash
npm run db:migrate
```

## Kiểm tra chất lượng

```bash
npm run check
npm run lint
npm run build
npm audit --omit=dev
```
