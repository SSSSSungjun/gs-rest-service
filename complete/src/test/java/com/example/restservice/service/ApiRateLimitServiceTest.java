package com.example.restservice.service;

import com.example.restservice.config.ApiRateLimitProperties;
import com.example.restservice.service.ApiRateLimitService.Decision;
import com.example.restservice.service.ApiRateLimitService.LimitScope;
import com.example.restservice.service.ApiRateLimitService.Policy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class ApiRateLimitServiceTest {

    private static final Clock FIXED_CLOCK = Clock.fixed(
            Instant.parse("2026-07-15T00:00:00Z"),
            ZoneOffset.UTC
    );

    @Test
    @DisplayName("같은 세션의 요청이 설정된 한도를 넘으면 차단한다")
    void blocksRequestsOverTheSessionLimit() {
        ApiRateLimitProperties properties = properties();
        properties.getContent().setSessionLimit(2);
        ApiRateLimitService service = new ApiRateLimitService(properties, FIXED_CLOCK);

        assertThat(service.tryConsume(Policy.CONTENT, "session-a", "203.0.113.10").allowed()).isTrue();
        assertThat(service.tryConsume(Policy.CONTENT, "session-a", "203.0.113.10").allowed()).isTrue();

        Decision blocked = service.tryConsume(Policy.CONTENT, "session-a", "203.0.113.10");

        assertThat(blocked.allowed()).isFalse();
        assertThat(blocked.scope()).isEqualTo(LimitScope.SESSION);
        assertThat(blocked.retryAfterSeconds()).isPositive();
    }

    @Test
    @DisplayName("세션 값을 바꿔도 같은 IP의 과도한 요청은 차단한다")
    void blocksCookieRotationByTheIpLimit() {
        ApiRateLimitProperties properties = properties();
        properties.getContent().setIpLimit(2);
        ApiRateLimitService service = new ApiRateLimitService(properties, FIXED_CLOCK);

        assertThat(service.tryConsume(Policy.CONTENT, "session-a", "203.0.113.20").allowed()).isTrue();
        assertThat(service.tryConsume(Policy.CONTENT, "session-b", "203.0.113.20").allowed()).isTrue();

        Decision blocked = service.tryConsume(Policy.CONTENT, "session-c", "203.0.113.20");

        assertThat(blocked.allowed()).isFalse();
        assertThat(blocked.scope()).isEqualTo(LimitScope.IP);
    }

    @Test
    @DisplayName("AI 일일 한도는 세션과 IP가 달라도 전체 요청 수를 제한한다")
    void enforcesTheGlobalDailyAiLimit() {
        ApiRateLimitProperties properties = properties();
        properties.getAi().setDailyLimit(2);
        ApiRateLimitService service = new ApiRateLimitService(properties, FIXED_CLOCK);

        assertThat(service.tryConsume(Policy.AI, "session-a", "203.0.113.31").allowed()).isTrue();
        assertThat(service.tryConsume(Policy.AI, "session-b", "203.0.113.32").allowed()).isTrue();

        Decision blocked = service.tryConsume(Policy.AI, "session-c", "203.0.113.33");

        assertThat(blocked.allowed()).isFalse();
        assertThat(blocked.scope()).isEqualTo(LimitScope.DAILY);
    }

    @Test
    @DisplayName("AI 동시 실행 수가 가득 차면 새 실행을 허용하지 않는다")
    void limitsConcurrentAiExecutions() {
        ApiRateLimitProperties properties = properties();
        properties.getAi().setMaxConcurrent(1);
        ApiRateLimitService service = new ApiRateLimitService(properties, FIXED_CLOCK);

        assertThat(service.tryAcquireAiPermit()).isTrue();
        assertThat(service.tryAcquireAiPermit()).isFalse();

        service.releaseAiPermit();

        assertThat(service.tryAcquireAiPermit()).isTrue();
        service.releaseAiPermit();
    }

    private ApiRateLimitProperties properties() {
        ApiRateLimitProperties properties = new ApiRateLimitProperties();
        properties.getAi().setSessionLimit(100);
        properties.getAi().setIpLimit(100);
        properties.getAi().setDailyLimit(100);
        properties.getContent().setSessionLimit(100);
        properties.getContent().setIpLimit(100);
        return properties;
    }
}
