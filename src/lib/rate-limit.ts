/**
 * 인메모리 토큰 버킷 기반 레이트 리미터
 * 외부 패키지 없이 구현
 */

interface RateLimitOptions {
  /** 시간 윈도우 (밀리초) */
  interval: number;
  /** 윈도우 내 추적 가능한 최대 고유 토큰(IP) 수 */
  uniqueTokenPerInterval: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

interface TokenBucket {
  count: number;
  resetAt: number;
}

export function rateLimit(options: RateLimitOptions) {
  const { interval, uniqueTokenPerInterval } = options;
  const tokenBuckets = new Map<string, TokenBucket>();

  // 주기적으로 만료된 엔트리 정리
  const cleanup = () => {
    const now = Date.now();
    if (tokenBuckets.size > uniqueTokenPerInterval) {
      // 만료된 엔트리부터 삭제
      for (const [key, bucket] of tokenBuckets) {
        if (bucket.resetAt <= now) {
          tokenBuckets.delete(key);
        }
      }
    }
    // 그래도 초과하면 가장 오래된 것부터 제거
    if (tokenBuckets.size > uniqueTokenPerInterval) {
      const entries = [...tokenBuckets.entries()].sort(
        (a, b) => a[1].resetAt - b[1].resetAt,
      );
      const toRemove = entries.slice(
        0,
        entries.length - uniqueTokenPerInterval,
      );
      for (const [key] of toRemove) {
        tokenBuckets.delete(key);
      }
    }
  };

  return {
    /**
     * 레이트 리밋 체크
     * @param token 고유 식별자 (IP 등)
     * @param maxRequests 윈도우 내 최대 요청 수
     */
    check(token: string, maxRequests: number): RateLimitResult {
      cleanup();

      const now = Date.now();
      const bucket = tokenBuckets.get(token);

      if (!bucket || bucket.resetAt <= now) {
        // 새 윈도우 시작
        const resetAt = now + interval;
        tokenBuckets.set(token, { count: 1, resetAt });
        return {
          success: true,
          limit: maxRequests,
          remaining: maxRequests - 1,
          reset: resetAt,
        };
      }

      // 기존 윈도우 내
      if (bucket.count >= maxRequests) {
        return {
          success: false,
          limit: maxRequests,
          remaining: 0,
          reset: bucket.resetAt,
        };
      }

      bucket.count += 1;
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - bucket.count,
        reset: bucket.resetAt,
      };
    },
  };
}

/**
 * IP 주소 추출 헬퍼
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return headers.get("x-real-ip") || "anonymous";
}

/**
 * 레이트 리밋 헤더를 NextResponse에 추가하는 헬퍼
 */
export function rateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };
}

// 전역 리미터 인스턴스 (API 라우트별로 공유)
const globalLimiter = rateLimit({
  interval: 60 * 1000, // 1분
  uniqueTokenPerInterval: 500,
});

export { globalLimiter };
