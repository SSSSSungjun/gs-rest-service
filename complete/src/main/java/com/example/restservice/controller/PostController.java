package com.example.restservice.controller;

import com.example.restservice.dto.request.PostRequestDto;
import com.example.restservice.dto.response.PostResponseDto;
import com.example.restservice.service.AnonymousSessionService;
import com.example.restservice.service.PostService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true")
public class PostController {

    private final PostService postService;
    private final AnonymousSessionService anonymousSessionService;

    @GetMapping
    public ResponseEntity<List<PostResponseDto>> getAllPosts(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String sessionId = anonymousSessionService.getOrCreateSessionId(request, response);
        return ResponseEntity.ok(postService.getAllPosts(sessionId));
    }

    @PostMapping
    public ResponseEntity<PostResponseDto> createPost(
            @RequestBody PostRequestDto requestDto,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String sessionId = anonymousSessionService.getOrCreateSessionId(request, response);
        return ResponseEntity.ok(postService.createPost(requestDto, sessionId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(
            @PathVariable Long id,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String sessionId = anonymousSessionService.getOrCreateSessionId(request, response);
        postService.deletePost(id, sessionId);
        return ResponseEntity.noContent().build();
    }
}
