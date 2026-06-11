# Moment License Admin

Moment Camera용 16자리 초대 코드/라이선스 코드 관리자 사이트입니다.

## 기능

- 앱 첫 실행용 16자리 코드 검증 API
- 관리자 비밀번호 기반 코드 관리 화면
- 코드 100개/1000개 대량 생성
- 기본 무제한 1기기 라이선스
- 구매 완료 후 자동 코드 발급 API
- 7일권, 30일권, 1년권, 직접 만료일 지정도 선택 가능
- 사용됨/미사용/중지 상태 확인
- 사용 가능 기기 수, 만료일, 메모 관리
- 최초 사용 기기 ID에 코드 자동 연결
- 다른 기기에서 같은 코드 재사용 차단
- 기기 변경 시 관리자 화면에서 기기 해제 가능
- Supabase DB 사용, 로컬 개발 시 JSON fallback

## 환경변수

Vercel Project Settings > Environment Variables에 아래 값을 넣습니다.

```env
ADMIN_PASSWORD=너만아는관리자비밀번호
ISSUE_SECRET=자동발급용비밀키
SUPABASE_URL=https://너의프로젝트.supabase.co
SUPABASE_SERVICE_ROLE_KEY=너의-service-role-key
LICENSE_ISSUER=Moment Camera
```

`SUPABASE_SERVICE_ROLE_KEY`는 절대 GitHub에 올리면 안 됩니다.
`ISSUE_SECRET`도 외부에 공개하면 안 됩니다.

## 자동 발급 API

구매 플랫폼, Make, Zapier, 자체 결제 서버에서 구매 완료 후 아래 API를 호출하면 무제한 1기기 코드가 자동 발급됩니다.

```http
POST /api/licenses/issue
Content-Type: application/json
x-issue-secret: 너의-ISSUE_SECRET

{
  "email": "buyer@example.com",
  "name": "Buyer Name",
  "orderId": "ORDER-10001",
  "source": "gumroad"
}
```

성공:

```json
{
  "ok": true,
  "duplicate": false,
  "code": "A7K9-D2Q8-M4XZ-91LP"
}
```

같은 `orderId`로 다시 요청하면 새 코드를 만들지 않고 기존 코드를 반환합니다.

## Supabase 설정

1. Supabase 프로젝트 생성
2. SQL Editor 열기
3. `supabase-schema.sql` 전체 실행
4. Vercel 환경변수에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 입력

## 로컬 실행

```powershell
npm install
npm run dev
```

브라우저에서 `http://localhost:3000/admin`을 엽니다.

## 앱 인증 API

앱은 아래 주소로 코드와 기기 ID를 보냅니다.

```http
POST /api/licenses/activate
Content-Type: application/json

{
  "code": "A7K9-D2Q8-M4XZ-91LP",
  "deviceId": "device-or-install-id",
  "platform": "android",
  "appVersion": "1.0"
}
```

성공:

```json
{
  "ok": true,
  "licenseId": "...",
  "activatedAt": "2026-06-02T00:00:00.000Z",
  "issuer": "Moment Camera"
}
```

실패 시 `ok: false`와 이유가 반환됩니다.
