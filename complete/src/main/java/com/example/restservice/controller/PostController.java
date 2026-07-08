package com.example.restservice.controller;

import com.example.restservice.dto.request.PostRequestDto;
import com.example.restservice.dto.response.PostImageResponseDto;
import com.example.restservice.dto.response.PostResponseDto;
import com.example.restservice.service.AnonymousSessionService;
import com.example.restservice.service.LikeService;
import com.example.restservice.service.PostImageStorageService;
import com.example.restservice.service.PostService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;
    private final LikeService likeService;
    private final PostImageStorageService postImageStorageService;
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
            @Valid @RequestBody PostRequestDto requestDto,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String sessionId = anonymousSessionService.getOrCreateSessionId(request, response);
        return ResponseEntity.ok(postService.createPost(requestDto, sessionId));
    }

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PostImageResponseDto> uploadPostImage(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(postImageStorageService.store(file));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<PostResponseDto> updatePost(
            @PathVariable Long id,
            @Valid @RequestBody PostRequestDto requestDto,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String sessionId = anonymousSessionService.getOrCreateSessionId(request, response);
        return ResponseEntity.ok(postService.updatePost(id, requestDto, sessionId));
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

    @PostMapping("/{id}/likes")
    public ResponseEntity<Void> togglePostLike(
            @PathVariable Long id,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String sessionId = anonymousSessionService.getOrCreateSessionId(request, response);
        likeService.togglePostLike(id, sessionId);
        return ResponseEntity.noContent().build();
    }
}
