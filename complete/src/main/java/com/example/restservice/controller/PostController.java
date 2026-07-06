package com.example.restservice.controller;

import com.example.restservice.dto.request.PostRequestDto;
import com.example.restservice.dto.response.PostResponseDto;
import com.example.restservice.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class PostController {

    private final PostService postService;

    @GetMapping
    public ResponseEntity<List<PostResponseDto>> getAllPosts() {
        return ResponseEntity.ok(postService.getAllPosts());
    }

    @PostMapping
    public ResponseEntity<PostResponseDto> createPost(@RequestBody PostRequestDto requestDto) {
        return ResponseEntity.ok(postService.createPost(requestDto));
    }

    // 삭제 요청 시 헤더나 파라미터로 토큰을 받아 검증
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(
            @PathVariable Long id,
            @RequestHeader("X-Anonymous-Token") String token) {
        postService.deletePost(id, token);
        return ResponseEntity.noContent().build();
    }
}