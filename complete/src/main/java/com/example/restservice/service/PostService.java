package com.example.restservice.service;

import com.example.restservice.dto.request.PostRequestDto;
import com.example.restservice.dto.response.PostResponseDto;
import com.example.restservice.entity.Post;
import com.example.restservice.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostService {
    private final PostRepository postRepository;

    // 최신순 전체 조회
    public List<PostResponseDto> getAllPosts() {
        return postRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(PostResponseDto::from)
                .collect(Collectors.toList());
    }

    // 익명 피드 작성
    @Transactional
    public PostResponseDto createPost(PostRequestDto requestDto) {
        Post post = Post.builder()
                .nickname(requestDto.getNickname())
                .content(requestDto.getContent())
                .anonymousToken(requestDto.getAnonymousToken())
                .build();

        return PostResponseDto.from(postRepository.save(post));
    }

    //토큰 검증 후 삭제
    @Transactional
    public void deletePost(Long id, String token) {
        postRepository.findById(id)
                .filter(post -> post.getAnonymousToken().equals(token)) // 토큰 일치 여부 필터링
                .ifPresentOrElse(
                        postRepository::delete, // 일치하면 삭제
                        () -> { throw new IllegalArgumentException("인증되지 않은 사용자가 아니거나 게시글이 없습니다."); } // 다르면 예외
                );
    }
    
}
