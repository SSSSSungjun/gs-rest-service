package com.example.restservice.controller;

import com.example.restservice.dto.request.CommentRequestDto;
import com.example.restservice.dto.response.CommentResponseDto;
import com.example.restservice.service.AnonymousSessionService;
import com.example.restservice.service.CommentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;
    private final AnonymousSessionService anonymousSessionService;

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<CommentResponseDto> createComment(
            @PathVariable Long postId,
            @Valid @RequestBody CommentRequestDto requestDto,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String sessionId = anonymousSessionService.getOrCreateSessionId(request, response);
        return ResponseEntity.ok(commentService.createComment(postId, requestDto, sessionId));
    }

    @PatchMapping("/comments/{commentId}")
    public ResponseEntity<CommentResponseDto> updateComment(
            @PathVariable Long commentId,
            @Valid @RequestBody CommentRequestDto requestDto,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String sessionId = anonymousSessionService.getOrCreateSessionId(request, response);
        return ResponseEntity.ok(commentService.updateComment(commentId, requestDto, sessionId));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long commentId,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String sessionId = anonymousSessionService.getOrCreateSessionId(request, response);
        commentService.deleteComment(commentId, sessionId);
        return ResponseEntity.noContent().build();
    }
}
