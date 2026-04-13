# 노무뚝딱 TRD (Technical Requirements Document)

## 기술 요구사항 문서

**문서 버전:** 1.0  
**최종 수정일:** 2026-02-04  
**작성자:** 엘비즈 파트너스

---

## 1. 기술 개요

### 1.1 시스템 아키텍처 (현재)

```
┌─────────────────────────────────────────────────────────┐
│                     클라이언트 (Browser)                  │
│  ┌─────────────────────────────────────────────────────┐│
│  │              Next.js 16 + React 19                  ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐ ││
│  │  │ Pages   │  │ Compo-  │  │ Lib (utils)         │ ││
│  │  │ - /     │  │ nents   │  │ - constants.ts      │ ││
│  │  │ - /emp  │  │         │  │ - storage.ts        │ ││
│  │  │ - /pay  │  │         │  │ - taxCalculations   │ ││
│  │  └─────────┘  └─────────┘  └─────────────────────┘ ││
│  └─────────────────────────────────────────────────────┘│
│                           │                              │
│                           ▼                              │
│  ┌─────────────────────────────────────────────────────┐│
│  │              localStorage (브라우저 저장소)           ││
│  │  - nomu_employees: 직원 데이터                       ││
│  │  - nomu_company: 회사 정보                           ││
│  │  - nomu_payments: 급여 기록                          ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 1.2 시스템 아키텍처 (목표)

```
┌─────────────────────────────────────────────────────────┐
│                     클라이언트                           │
│  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │   Web (Next.js)  │  │   Mobile (React Native)      │ │
│  └────────┬─────────┘  └─────────────┬────────────────┘ │
└───────────┼──────────────────────────┼──────────────────┘
            │                          │
            ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│                      API Gateway                         │
│                    (Vercel Edge)                         │
└───────────────────────────┬─────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│   Auth Service   │ │  Main API    │ │  File Storage    │
│   (Supabase)     │ │  (Next.js)   │ │  (S3/Cloudflare) │
└────────┬─────────┘ └──────┬───────┘ └────────┬─────────┘
         │                  │                   │
         ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL (Supabase)                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐│
│  │ users   │  │companies│  │employees│  │ payments    ││
│  └─────────┘  └─────────┘  └─────────┘  └─────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 2. 현재 기술 스택

### 2.1 프론트엔드

| 기술               | 버전   | 용도             |
| ------------------ | ------ | ---------------- |
| **Next.js**        | 16.1.6 | React 프레임워크 |
| **React**          | 19.0.0 | UI 라이브러리    |
| **TypeScript**     | 5.x    | 타입 시스템      |
| **Tailwind CSS**   | 4.x    | 스타일링         |
| **react-to-print** | -      | PDF/인쇄 기능    |

### 2.2 배포

| 기술       | 용도           |
| ---------- | -------------- |
| **Vercel** | 호스팅, CI/CD  |
| **GitHub** | 소스 코드 관리 |

### 2.3 저장소

| 기술             | 용도            | 한계                      |
| ---------------- | --------------- | ------------------------- |
| **localStorage** | 클라이언트 저장 | 5MB 제한, 브라우저별 분리 |

---

## 3. 목표 기술 스택

### 3.1 백엔드 (Phase 2)

| 기술           | 버전 | 용도         | 선택 이유                        |
| -------------- | ---- | ------------ | -------------------------------- |
| **Supabase**   | -    | BaaS         | 빠른 개발, PostgreSQL, 인증 내장 |
| **PostgreSQL** | 15+  | 데이터베이스 | 안정성, JSON 지원                |
| **Prisma**     | 5.x  | ORM          | 타입 안전, 마이그레이션          |

### 3.2 인증 (Phase 2)

| 기술              | 용도               |
| ----------------- | ------------------ |
| **Supabase Auth** | 이메일/소셜 로그인 |
| **JWT**           | 토큰 기반 인증     |
| **Kakao OAuth**   | 소셜 로그인        |
| **Google OAuth**  | 소셜 로그인        |

### 3.3 결제 (Phase 3)

| 기술             | 용도                       |
| ---------------- | -------------------------- |
| **토스페이먼츠** | 국내 결제 (카드, 계좌이체) |
| **Stripe**       | 해외 결제 (옵션)           |

### 3.4 파일 저장 (Phase 2)

| 기술                 | 용도             |
| -------------------- | ---------------- |
| **Supabase Storage** | PDF, 이미지 저장 |
| **Cloudflare R2**    | 백업 (옵션)      |

### 3.5 모니터링 (Phase 3)

| 기술                 | 용도                 |
| -------------------- | -------------------- |
| **Vercel Analytics** | 웹 분석              |
| **Sentry**           | 에러 트래킹          |
| **LogRocket**        | 세션 리플레이 (옵션) |

---

## 4. 데이터베이스 설계

### 4.1 ERD (Entity Relationship Diagram)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users     │     │  companies   │     │  employees   │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │────<│ id (PK)      │────<│ id (PK)      │
│ email        │     │ user_id (FK) │     │ company_id   │
│ password_hash│     │ name         │     │ name         │
│ created_at   │     │ business_no  │     │ resident_no  │
│ updated_at   │     │ ceo_name     │     │ phone        │
└──────────────┘     │ address      │     │ emp_type     │
                     │ phone        │     │ status       │
                     │ created_at   │     │ hire_date    │
                     └──────────────┘     │ department   │
                                          │ position     │
                                          │ created_at   │
                                          └──────────────┘
                                                 │
                     ┌──────────────┐            │
                     │   salaries   │            │
                     ├──────────────┤            │
                     │ id (PK)      │<───────────┘
                     │ employee_id  │
                     │ base_salary  │
                     │ meal_allow   │
                     │ car_allow    │
                     │ child_allow  │
                     │ updated_at   │
                     └──────────────┘
                            │
                     ┌──────────────┐
                     │   payments   │
                     ├──────────────┤
                     │ id (PK)      │
                     │ employee_id  │
                     │ year         │
                     │ month        │
                     │ pay_date     │
                     │ total_earn   │
                     │ total_deduct │
                     │ net_pay      │
                     │ status       │
                     │ created_at   │
                     └──────────────┘
```

### 4.2 테이블 상세

#### users (사용자)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(100),
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'owner',  -- owner, admin, viewer
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### companies (회사)

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  business_number VARCHAR(12),  -- 사업자등록번호
  ceo_name VARCHAR(100),
  address TEXT,
  phone VARCHAR(20),
  industry VARCHAR(100),  -- 업종
  employee_count INT DEFAULT 0,
  plan VARCHAR(20) DEFAULT 'free',  -- free, pro, business
  plan_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### employees (직원)

```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  resident_number_encrypted BYTEA,  -- 암호화 저장
  resident_number_last4 VARCHAR(4),  -- 마스킹용
  phone VARCHAR(20),
  address TEXT,
  employment_type VARCHAR(20) NOT NULL,  -- fulltime, parttime, freelancer
  status VARCHAR(20) DEFAULT 'active',  -- active, resigned, pending
  hire_date DATE,
  resign_date DATE,
  department VARCHAR(100),
  position VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### salaries (급여 정보)

```sql
CREATE TABLE salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  salary_type VARCHAR(20) DEFAULT 'monthly',  -- monthly, hourly
  base_salary INT NOT NULL,
  hourly_wage INT,
  meal_allowance INT DEFAULT 0,
  car_allowance INT DEFAULT 0,
  childcare_allowance INT DEFAULT 0,
  national_pension BOOLEAN DEFAULT TRUE,
  health_insurance BOOLEAN DEFAULT TRUE,
  employment_insurance BOOLEAN DEFAULT TRUE,
  industrial_insurance BOOLEAN DEFAULT TRUE,
  tax_exempt_car BOOLEAN DEFAULT FALSE,
  tax_exempt_child BOOLEAN DEFAULT FALSE,
  tax_exempt_research BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id)
);
```

#### payments (급여 지급 기록)

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL,
  payment_date DATE,
  -- 지급 내역
  base_salary INT,
  overtime_pay INT DEFAULT 0,
  bonus INT DEFAULT 0,
  meal_allowance INT DEFAULT 0,
  car_allowance INT DEFAULT 0,
  childcare_allowance INT DEFAULT 0,
  total_earnings INT,
  -- 공제 내역
  national_pension INT,
  health_insurance INT,
  long_term_care INT,
  employment_insurance INT,
  income_tax INT,
  local_tax INT,
  total_deductions INT,
  -- 결과
  net_pay INT,
  status VARCHAR(20) DEFAULT 'pending',  -- pending, paid
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, year, month)
);
```

### 4.3 인덱스

```sql
-- 조회 성능 최적화
CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_payments_employee ON payments(employee_id);
CREATE INDEX idx_payments_year_month ON payments(year, month);
CREATE INDEX idx_companies_user ON companies(user_id);
```

---

## 5. API 설계

### 5.1 인증 API

| 메서드 | 엔드포인트                  | 설명            |
| ------ | --------------------------- | --------------- |
| POST   | `/api/auth/signup`          | 회원가입        |
| POST   | `/api/auth/login`           | 로그인          |
| POST   | `/api/auth/logout`          | 로그아웃        |
| POST   | `/api/auth/refresh`         | 토큰 갱신       |
| POST   | `/api/auth/forgot-password` | 비밀번호 찾기   |
| POST   | `/api/auth/reset-password`  | 비밀번호 재설정 |

### 5.2 회사 API

| 메서드 | 엔드포인트          | 설명           |
| ------ | ------------------- | -------------- |
| GET    | `/api/company`      | 회사 정보 조회 |
| PUT    | `/api/company`      | 회사 정보 수정 |
| POST   | `/api/company/logo` | 로고 업로드    |

### 5.3 직원 API

| 메서드 | 엔드포인트                  | 설명           |
| ------ | --------------------------- | -------------- |
| GET    | `/api/employees`            | 직원 목록 조회 |
| GET    | `/api/employees/:id`        | 직원 상세 조회 |
| POST   | `/api/employees`            | 직원 등록      |
| PUT    | `/api/employees/:id`        | 직원 수정      |
| DELETE | `/api/employees/:id`        | 직원 삭제      |
| GET    | `/api/employees/:id/salary` | 급여 정보 조회 |
| PUT    | `/api/employees/:id/salary` | 급여 정보 수정 |

### 5.4 급여 API

| 메서드 | 엔드포인트               | 설명           |
| ------ | ------------------------ | -------------- |
| GET    | `/api/payments`          | 급여 기록 조회 |
| POST   | `/api/payments`          | 급여 지급 등록 |
| GET    | `/api/payments/:id`      | 급여 상세 조회 |
| GET    | `/api/payments/:id/pdf`  | 급여명세서 PDF |
| GET    | `/api/wage-ledger`       | 임금대장 조회  |
| GET    | `/api/wage-ledger/excel` | 임금대장 Excel |

### 5.5 문서 API

| 메서드 | 엔드포인트                  | 설명                 |
| ------ | --------------------------- | -------------------- |
| POST   | `/api/contracts/fulltime`   | 정규직 계약서 생성   |
| POST   | `/api/contracts/parttime`   | 파트타임 계약서 생성 |
| POST   | `/api/contracts/freelancer` | 프리랜서 계약서 생성 |
| GET    | `/api/contracts/:id/pdf`    | 계약서 PDF           |

---

## 6. 보안 요구사항

### 6.1 데이터 암호화

| 데이터       | 암호화 방식      | 비고           |
| ------------ | ---------------- | -------------- |
| 주민등록번호 | AES-256-GCM      | DB 암호화 저장 |
| 비밀번호     | bcrypt (cost 12) | 단방향 해시    |
| 세션 토큰    | JWT (HS256)      | 30분 만료      |
| API 통신     | TLS 1.3          | HTTPS 필수     |

### 6.2 암호화 구현 예시

```typescript
// 주민등록번호 암호화
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32 bytes
const IV_LENGTH = 12;

export function encryptResidentNumber(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(
    "aes-256-gcm",
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv,
  );
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
}

export function decryptResidentNumber(encrypted: string): string {
  const [ivHex, authTagHex, encryptedText] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv,
  );
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
```

### 6.3 접근 제어

```typescript
// 미들웨어 예시
export async function authMiddleware(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = verifyToken(token);
    // 회사 데이터 접근 권한 확인
    const companyId = req.nextUrl.searchParams.get("companyId");
    if (companyId && payload.companyId !== companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
```

---

## 7. 파일 구조 (목표)

```
nomu-ttuktak/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # 인증 관련 페이지
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── forgot-password/
│   │   ├── (dashboard)/        # 대시보드 (인증 필요)
│   │   │   ├── employees/
│   │   │   ├── payslip/
│   │   │   ├── contracts/
│   │   │   ├── wage-ledger/
│   │   │   └── settings/
│   │   ├── api/                # API Routes
│   │   │   ├── auth/
│   │   │   ├── employees/
│   │   │   ├── payments/
│   │   │   └── contracts/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                 # 공통 UI 컴포넌트
│   │   ├── forms/              # 폼 컴포넌트
│   │   └── layouts/            # 레이아웃 컴포넌트
│   ├── lib/
│   │   ├── db/                 # 데이터베이스
│   │   │   ├── prisma.ts
│   │   │   └── queries/
│   │   ├── auth/               # 인증
│   │   │   ├── session.ts
│   │   │   └── oauth.ts
│   │   ├── utils/              # 유틸리티
│   │   │   ├── constants.ts
│   │   │   ├── calculations.ts
│   │   │   └── encryption.ts
│   │   └── validators/         # 유효성 검사
│   ├── types/                  # TypeScript 타입
│   └── hooks/                  # React Hooks
├── prisma/
│   ├── schema.prisma           # DB 스키마
│   └── migrations/             # 마이그레이션
├── public/
├── docs/                       # 문서
│   ├── PRD.md
│   ├── TRD.md
│   └── TODO.md
├── tests/                      # 테스트
│   ├── unit/
│   └── e2e/
└── package.json
```

---

## 8. 테스트 전략

### 8.1 테스트 레벨

| 레벨             | 도구       | 커버리지 목표 |
| ---------------- | ---------- | ------------- |
| Unit Test        | Jest       | 80%           |
| Integration Test | Jest + MSW | 주요 API      |
| E2E Test         | Playwright | 핵심 플로우   |

### 8.2 테스트 케이스 (예시)

```typescript
// 급여 계산 유닛 테스트
describe("calculateInsurance", () => {
  it("should calculate national pension correctly", () => {
    const result = calculateInsurance(2500000);
    expect(result.nationalPension).toBe(112500); // 4.5%
  });

  it("should apply upper limit for national pension", () => {
    const result = calculateInsurance(10000000);
    expect(result.nationalPension).toBe(277650); // 상한: 617만원 * 4.5%
  });
});

// 급여 최적화 테스트
describe("optimizeSalary", () => {
  it("should maximize tax-free allowances", () => {
    const result = optimizeSalary(3000000, { hasOwnCar: true });
    expect(result.mealAllowance).toBe(200000);
    expect(result.carAllowance).toBe(200000);
    expect(result.baseSalary).toBe(2600000);
  });
});
```

---

## 9. 배포 전략

### 9.1 환경 구성

| 환경        | URL                             | 용도      |
| ----------- | ------------------------------- | --------- |
| Development | localhost:3000                  | 로컬 개발 |
| Staging     | staging.nomu-ttuktak.vercel.app | 테스트    |
| Production  | nomu-ttuktak.vercel.app         | 운영      |

### 9.2 CI/CD 파이프라인

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: "--prod"
```

### 9.3 환경 변수

```env
# .env.example
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Auth
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...

# Encryption
ENCRYPTION_KEY=... # 32 bytes hex

# Payment (Phase 3)
TOSS_CLIENT_KEY=...
TOSS_SECRET_KEY=...

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
KAKAO_CLIENT_ID=...
KAKAO_CLIENT_SECRET=...
```

---

## 10. 성능 최적화

### 10.1 프론트엔드

- Next.js Image 최적화
- 컴포넌트 lazy loading
- React.memo / useMemo 적용
- Tailwind CSS purge

### 10.2 백엔드

- 데이터베이스 인덱스 최적화
- 쿼리 캐싱 (Redis - 필요시)
- API 응답 압축 (gzip)
- 페이지네이션

### 10.3 성능 목표

| 지표                           | 목표    |
| ------------------------------ | ------- |
| LCP (Largest Contentful Paint) | < 2.5s  |
| FID (First Input Delay)        | < 100ms |
| CLS (Cumulative Layout Shift)  | < 0.1   |
| TTFB (Time to First Byte)      | < 200ms |

---

## 부록

### A. 2026년 요율표

```typescript
// 4대보험 요율 (2026년)
export const INSURANCE_RATES = {
  nationalPension: { employee: 0.045, employer: 0.045 },
  healthInsurance: { employee: 0.03545, employer: 0.03545 },
  longTermCare: 0.1295, // 건강보험의 12.95%
  employmentInsurance: { employee: 0.009, employer: 0.009 },
  industrialInsurance: 0.007 ~ 0.34, // 업종별 상이
};

// 최저임금 (2026년)
export const MINIMUM_WAGE = {
  hourly: 10320,
  monthly: 2156880, // 209시간 기준
};

// 비과세 한도
export const TAX_EXEMPTION_LIMITS = {
  mealAllowance: 200000,
  carAllowance: 200000,
  childcareAllowance: 200000,
  researchAllowance: 200000,
};
```

### B. 참고 문서

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

_본 문서는 개발 진행에 따라 지속적으로 업데이트됩니다._
