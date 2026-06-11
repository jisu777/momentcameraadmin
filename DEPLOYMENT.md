# Moment License Admin 배포 방법

## 1. GitHub에 업로드

`moment-license-admin-github-upload` 폴더 안의 파일만 새 GitHub 저장소에 업로드합니다.

업로드하면 안 되는 폴더:

- `node_modules`
- `.next`
- `.env`

## 2. Vercel에 연결

1. Vercel 접속
2. Add New Project
3. GitHub에서 방금 만든 저장소 선택
4. Framework Preset은 Next.js 그대로 사용
5. Deploy 클릭

## 3. Supabase 준비

1. Supabase 프로젝트 생성
2. SQL Editor 열기
3. `supabase-schema.sql` 전체 복사 후 실행
4. Project Settings > API에서 아래 값 확인
   - Project URL
   - service_role key

## 4. Vercel 환경변수

Vercel 프로젝트에서 Settings > Environment Variables에 아래 값을 추가합니다.

```env
ADMIN_PASSWORD=너만아는관리자비밀번호
ISSUE_SECRET=자동발급용비밀키
SUPABASE_URL=https://너의프로젝트.supabase.co
SUPABASE_SERVICE_ROLE_KEY=너의-service-role-key
LICENSE_ISSUER=Moment Camera
```

모든 Environment는 Production, Preview, Development에 체크해도 됩니다.

환경변수 추가 후 반드시 Redeploy를 해야 반영됩니다.

## 5. 접속 주소

배포 주소가 예를 들어 아래처럼 생겼다면:

```text
https://moment-license-admin.vercel.app
```

홈페이지:

```text
https://moment-license-admin.vercel.app
```

관리자 페이지:

```text
https://moment-license-admin.vercel.app/admin
```

앱에 넣을 API 주소:

```text
https://moment-license-admin.vercel.app
```

앱은 이 주소 뒤에 `/api/licenses/activate`를 붙여서 인증합니다.

자동발급 API는 이 주소 뒤에 `/api/licenses/issue`를 붙여서 사용합니다.

```text
https://momentcameraadmin.netlify.app/api/licenses/issue
```
