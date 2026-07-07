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
    @Transactional(readOnly = true)
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
public void deletePost(Long id, String anonymousToken) {
    Post post = postRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 글입니다."));

    if (!post.getAnonymousToken().equals(anonymousToken)) {
        throw new IllegalArgumentException("본인이 작성한 글만 삭제할 수 있습니다.");
    }

    postRepository.delete(post);
}
    
}
