package com.example.restservice.controller;

import com.example.restservice.service.AnonymousSessionService;
import com.example.restservice.service.BoardActivityStreamService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/activity")
@RequiredArgsConstructor
public class BoardActivityController {

    private final BoardActivityStreamService boardActivityStreamService;
    private final AnonymousSessionService anonymousSessionService;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(
            @RequestHeader(value = "Last-Event-ID", required = false) String lastEventId,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String sessionId = anonymousSessionService.getOrCreateSessionId(request, response);
        response.setHeader("Cache-Control", "no-cache, no-store");
        response.setHeader("X-Accel-Buffering", "no");
        return boardActivityStreamService.subscribe(sessionId, lastEventId);
    }
}
