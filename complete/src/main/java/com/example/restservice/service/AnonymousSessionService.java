package com.example.restservice.service;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;

@Service
public class AnonymousSessionService {
    public static final String COOKIE_NAME = "anonymous_session_id";
    private static final Duration COOKIE_MAX_AGE = Duration.ofDays(30);

    private final boolean secureCookie;

    public AnonymousSessionService(@Value("${app.cookie.secure:false}") boolean secureCookie) {
        this.secureCookie = secureCookie;
    }

    public String getOrCreateSessionId(HttpServletRequest request, HttpServletResponse response) {
        return findSessionId(request).orElseGet(() -> issueSessionCookie(response));
    }

    public Optional<String> findSessionId(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }

        return Arrays.stream(cookies)
                .filter(cookie -> COOKIE_NAME.equals(cookie.getName()))
                .map(Cookie::getValue)
                .filter(this::isValidSessionId)
                .findFirst();
    }

    private boolean isValidSessionId(String value) {
        if (value == null || value.length() != 36) {
            return false;
        }
        try {
            return UUID.fromString(value).toString().equals(value);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private String issueSessionCookie(HttpServletResponse response) {
        String sessionId = UUID.randomUUID().toString();
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, sessionId)
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Lax")
                .path("/")
                .maxAge(COOKIE_MAX_AGE)
                .build();

        response.addHeader("Set-Cookie", cookie.toString());
        return sessionId;
    }
}