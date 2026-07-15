package com.example.restservice.config;

import com.example.restservice.service.AnonymousSessionService;
import com.example.restservice.service.ApiRateLimitService;
import com.example.restservice.service.ApiRateLimitService.Decision;
import com.example.restservice.service.ApiRateLimitService.Policy;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.regex.Pattern;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class ApiRateLimitFilter extends OncePerRequestFilter {

    private static final Pattern POST_COMMENT = Pattern.compile("^/api/posts/\\d+/comments$");
    private static final Pattern POST_MUTATION = Pattern.compile("^/api/posts/\\d+$");
    private static final Pattern COMMENT_MUTATION = Pattern.compile("^/api/comments/\\d+$");
    private static final Pattern INTERACTION = Pattern.compile(
            "^/api/(posts/\\d+/(views|likes|poll-options/\\d+/votes)|comments/\\d+/likes)$"
    );

    private final ApiRateLimitProperties properties;
    private final AnonymousSessionService anonymousSessionService;
    private final ApiRateLimitService rateLimitService;
    private final ObjectMapper objectMapper;

    public ApiRateLimitFilter(
            ApiRateLimitProperties properties,
            AnonymousSessionService anonymousSessionService,
            ApiRateLimitService rateLimitService,
            ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.anonymousSessionService = anonymousSessionService;
        this.rateLimitService = rateLimitService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !properties.isEnabled()
                || resolvePolicy(request.getMethod(), request.getRequestURI()) == null;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        Policy policy = resolvePolicy(request.getMethod(), request.getRequestURI());
        if (policy == null) {
            filterChain.doFilter(request, response);
            return;
        }

        boolean aiPermitAcquired = false;
        if (policy == Policy.AI) {
            aiPermitAcquired = rateLimitService.tryAcquireAiPermit();
            if (!aiPermitAcquired) {
                writeRateLimitResponse(response, policy, 2, true);
                return;
            }
        }

        try {
            String sessionId = anonymousSessionService.getOrCreateSessionId(request, response);
            Decision decision = rateLimitService.tryConsume(
                    policy,
                    sessionId,
                    request.getRemoteAddr()
            );

            if (!decision.allowed()) {
                writeRateLimitResponse(response, policy, decision.retryAfterSeconds(), false);
                return;
            }

            filterChain.doFilter(request, response);
        } finally {
            if (aiPermitAcquired) {
                rateLimitService.releaseAiPermit();
            }
        }
    }

    static Policy resolvePolicy(String method, String path) {
        if ("POST".equals(method) && "/api/ai/drafts".equals(path)) {
            return Policy.AI;
        }
        if ("POST".equals(method) && "/api/posts/images".equals(path)) {
            return Policy.UPLOAD;
        }
        if ("POST".equals(method)
                && ("/api/posts".equals(path) || POST_COMMENT.matcher(path).matches())) {
            return Policy.CONTENT;
        }
        if (("PATCH".equals(method) || "DELETE".equals(method))
                && (POST_MUTATION.matcher(path).matches() || COMMENT_MUTATION.matcher(path).matches())) {
            return Policy.CONTENT;
        }
        if ("POST".equals(method) && INTERACTION.matcher(path).matches()) {
            return Policy.INTERACTION;
        }
        return null;
    }

    private void writeRateLimitResponse(
            HttpServletResponse response,
            Policy policy,
            long retryAfterSeconds,
            boolean concurrencyLimited
    ) throws IOException {
        response.setStatus(429);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Retry-After", Long.toString(Math.max(1, retryAfterSeconds)));
        response.setHeader("Cache-Control", "no-store");

        String message;
        if (concurrencyLimited) {
            message = "AI 글쓰기 요청이 몰리고 있습니다. 잠시 후 다시 시도해 주세요.";
        } else if (policy == Policy.AI) {
            message = "AI 글쓰기 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.";
        } else {
            message = "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
        }
        objectMapper.writeValue(response.getWriter(), Map.of("message", message));
    }
}
