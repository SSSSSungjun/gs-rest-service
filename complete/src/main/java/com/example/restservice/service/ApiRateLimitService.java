package com.example.restservice.service;

import com.example.restservice.config.ApiRateLimitProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class ApiRateLimitService {

    private static final ZoneId BILLING_ZONE = ZoneId.of("Asia/Seoul");
    private static final long CLEANUP_INTERVAL = 512;

    private final ApiRateLimitProperties properties;
    private final Clock clock;
    private final Semaphore aiPermits;
    private final Map<BucketKey, BucketState> buckets = new ConcurrentHashMap<>();
    private final AtomicLong operationCount = new AtomicLong();
    private final Object dailyAiLock = new Object();

    private LocalDate aiUsageDate;
    private int aiUsageCount;

    @Autowired
    public ApiRateLimitService(ApiRateLimitProperties properties) {
        this(properties, Clock.systemUTC());
    }

    ApiRateLimitService(ApiRateLimitProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
        this.aiPermits = new Semaphore(requirePositive(
                properties.getAi().getMaxConcurrent(),
                "app.rate-limit.ai.max-concurrent"
        ), true);
        validateRule(properties.getAi(), "ai");
        validateRule(properties.getContent(), "content");
        validateRule(properties.getUpload(), "upload");
        validateRule(properties.getInteraction(), "interaction");
        requirePositive(properties.getAi().getDailyLimit(), "app.rate-limit.ai.daily-limit");
    }

    public Decision tryConsume(Policy policy, String sessionId, String remoteAddress) {
        ApiRateLimitProperties.Rule rule = ruleFor(policy);
        long now = clock.millis();

        Decision sessionDecision = consume(
                new BucketKey(policy, Identity.SESSION, sessionId),
                rule.getSessionLimit(),
                rule.getWindow(),
                now
        );
        if (!sessionDecision.allowed()) {
            return sessionDecision;
        }

        Decision ipDecision = consume(
                new BucketKey(policy, Identity.IP, normalizeAddress(remoteAddress)),
                rule.getIpLimit(),
                rule.getWindow(),
                now
        );
        if (!ipDecision.allowed()) {
            return ipDecision;
        }

        if (policy == Policy.AI) {
            Decision dailyDecision = consumeDailyAi();
            if (!dailyDecision.allowed()) {
                return dailyDecision;
            }
        }

        cleanupStaleBuckets(now);
        return Decision.granted();
    }

    public boolean tryAcquireAiPermit() {
        return aiPermits.tryAcquire();
    }

    public void releaseAiPermit() {
        aiPermits.release();
    }

    private Decision consume(BucketKey key, int capacity, Duration window, long now) {
        DecisionHolder holder = new DecisionHolder();

        buckets.compute(key, (ignored, current) -> {
            BucketState state = current == null ? new BucketState(capacity, now) : current;
            state.refill(capacity, window, now);
            holder.decision = state.tryConsume(capacity, window, key.identity(), now);
            return state;
        });

        return holder.decision;
    }

    private Decision consumeDailyAi() {
        synchronized (dailyAiLock) {
            ZonedDateTime now = ZonedDateTime.now(clock.withZone(BILLING_ZONE));
            LocalDate today = now.toLocalDate();

            if (!today.equals(aiUsageDate)) {
                aiUsageDate = today;
                aiUsageCount = 0;
            }

            if (aiUsageCount < properties.getAi().getDailyLimit()) {
                aiUsageCount++;
                return Decision.granted();
            }

            long retryAfterSeconds = Math.max(
                    1,
                    Duration.between(now, today.plusDays(1).atStartOfDay(BILLING_ZONE)).toSeconds()
            );
            return Decision.blocked(retryAfterSeconds, LimitScope.DAILY);
        }
    }

    private void cleanupStaleBuckets(long now) {
        if (operationCount.incrementAndGet() % CLEANUP_INTERVAL != 0) {
            return;
        }

        long staleAfterMillis = requirePositiveDuration(
                properties.getStaleAfter(),
                "app.rate-limit.stale-after"
        ).toMillis();
        buckets.entrySet().removeIf(entry -> now - entry.getValue().lastAccessMillis > staleAfterMillis);
    }

    private ApiRateLimitProperties.Rule ruleFor(Policy policy) {
        return switch (policy) {
            case AI -> properties.getAi();
            case CONTENT -> properties.getContent();
            case UPLOAD -> properties.getUpload();
            case INTERACTION -> properties.getInteraction();
        };
    }

    private void validateRule(ApiRateLimitProperties.Rule rule, String name) {
        requirePositive(rule.getSessionLimit(), "app.rate-limit." + name + ".session-limit");
        requirePositive(rule.getIpLimit(), "app.rate-limit." + name + ".ip-limit");
        requirePositiveDuration(rule.getWindow(), "app.rate-limit." + name + ".window");
    }

    private static int requirePositive(int value, String propertyName) {
        if (value <= 0) {
            throw new IllegalArgumentException(propertyName + " must be greater than zero");
        }
        return value;
    }

    private static Duration requirePositiveDuration(Duration value, String propertyName) {
        if (value == null || value.isZero() || value.isNegative()) {
            throw new IllegalArgumentException(propertyName + " must be a positive duration");
        }
        return value;
    }

    private static String normalizeAddress(String remoteAddress) {
        if (remoteAddress == null || remoteAddress.isBlank()) {
            return "unknown";
        }
        return remoteAddress;
    }

    public enum Policy {
        AI,
        CONTENT,
        UPLOAD,
        INTERACTION
    }

    public enum LimitScope {
        SESSION,
        IP,
        DAILY
    }

    public record Decision(boolean allowed, long retryAfterSeconds, LimitScope scope) {
        static Decision granted() {
            return new Decision(true, 0, null);
        }

        static Decision blocked(long retryAfterSeconds, LimitScope scope) {
            return new Decision(false, Math.max(1, retryAfterSeconds), scope);
        }
    }

    private enum Identity {
        SESSION,
        IP
    }

    private record BucketKey(Policy policy, Identity identity, String value) {
    }

    private static final class DecisionHolder {
        private Decision decision;
    }

    private static final class BucketState {
        private double tokens;
        private long lastRefillMillis;
        private long lastAccessMillis;

        private BucketState(int capacity, long now) {
            this.tokens = capacity;
            this.lastRefillMillis = now;
            this.lastAccessMillis = now;
        }

        private void refill(int capacity, Duration window, long now) {
            long elapsedMillis = Math.max(0, now - lastRefillMillis);
            long windowMillis = requirePositiveDuration(window, "rate limit window").toMillis();
            double refill = elapsedMillis * (capacity / (double) windowMillis);

            tokens = Math.min(capacity, tokens + refill);
            lastRefillMillis = now;
            lastAccessMillis = now;
        }

        private Decision tryConsume(
                int capacity,
                Duration window,
                Identity identity,
                long now
        ) {
            lastAccessMillis = now;
            if (tokens >= 1) {
                tokens -= 1;
                return Decision.granted();
            }

            long windowMillis = window.toMillis();
            long retryMillis = (long) Math.ceil((1 - tokens) * windowMillis / capacity);
            long retrySeconds = Math.max(1, (long) Math.ceil(retryMillis / 1000.0));
            LimitScope scope = identity == Identity.SESSION ? LimitScope.SESSION : LimitScope.IP;
            return Decision.blocked(retrySeconds, scope);
        }
    }
}
