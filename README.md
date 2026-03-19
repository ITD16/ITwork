# Netlify Config Admin v2

## Có gì trong bản này
- Login user bằng bcrypt password hash
- Force change password popup khi `mustChangePassword = true`
- Admin card User Management
- Admin reset password random cho user
- Reset sẽ bật lại `mustChangePassword = true`
- Lưu user vào `data/users.json`
- Config vẫn đọc/ghi từ GitHub repo
- Auto logout sau 5 phút không thao tác

## Env trên Netlify
- `AUTH_SECRET`
- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH`
- `CONFIG_PATH`
- `LOG_PATH`

## Lưu ý
- `data/users.json` trong bộ này đang để placeholder hash cho admin và user1
- Mày nên tự tạo hash thật cho admin password của mày rồi thay vào file này

## Hash user cũ
Nếu users cũ còn lưu `"password"`, chạy:
```bash
npm install
npm run hash-users
```
