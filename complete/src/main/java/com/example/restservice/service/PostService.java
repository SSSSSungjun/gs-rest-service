package com.example.restservice.service;

import com.example.restservice.dto.request.PostRequestDto;
import com.example.restservice.dto.response.PostResponseDto;
import com.example.restservice.entity.Post;
import com.example.restservice.exception.ForbiddenOperationException;
import com.example.restservice.repository.CommentLikeRepository;
import com.example.restservice.repository.LikeCountProjection;
import com.example.restservice.repository.PostLikeRepository;
import com.example.restservice.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostService {
    private static final String DEFAULT_NICKNAME = "익명";

    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;
    private final CommentLikeRepository commentLikeRepository;

    public List<PostResponseDto> getAllPosts(String sessionId) {
        List<Post> posts = postRepository.findAllByOrderByCreatedAtDesc();
        List<Long> postIds = posts.stream()
                .map(Post::getId)
                .toList();
        List<Long> commentIds = posts.stream()
                .flatMap(post -> post.getComments().stream())
                .map(comment -> comment.getId())
                .toList();

        Map<Long, Long> postLikeCounts = getPostLikeCounts(postIds);
        Set<Long> likedPostIds = postIds.isEmpty()
                ? Set.of()
                : Set.copyOf(postLikeRepository.findLikedPostIds(sessionId, postIds));
        Map<Long, Long> commentLikeCounts = getCommentLikeCounts(commentIds);
        Set<Long> likedCommentIds = commentIds.isEmpty()
                ? Set.of()
                : Set.copyOf(commentLikeRepository.findLikedCommentIds(sessionId, commentIds));

        return posts.stream()
                .map(post -> PostResponseDto.from(
                        post,
                        sessionId,
                        postLikeCounts.getOrDefault(post.getId(), 0L),
                        likedPostIds.contains(post.getId()),
                        commentLikeCounts,
                        likedCommentIds
                ))
                .toList();
    }

    @Transactional
    public PostResponseDto createPost(PostRequestDto requestDto, String sessionId) {
        validateContent(requestDto.getContent());

        Post post = Post.builder()
                .nickname(normalizeNickname(requestDto.getNickname()))
                .content(requestDto.getContent().trim())
                .ownerSessionId(sessionId)
                .build();

        return PostResponseDto.from(postRepository.save(post), sessionId);
    }

    @Transactional
    public PostResponseDto updatePost(Long id, PostRequestDto requestDto, String sessionId) {
        validateContent(requestDto.getContent());

        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 글입니다."));
        validateOwner(post, sessionId);

        post.update(normalizeNickname(requestDto.getNickname()), requestDto.getContent().trim());
        return PostResponseDto.from(post, sessionId);
    }

    @Transactional
    public void deletePost(Long id, String sessionId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 글입니다."));
        validateOwner(post, sessionId);

        commentLikeRepository.deleteByPostId(id);
        postLikeRepository.deleteByPostId(id);
        postRepository.delete(post);
    }

    private Map<Long, Long> getPostLikeCounts(List<Long> postIds) {
        if (postIds.isEmpty()) {
            return Map.of();
        }
        return postLikeRepository.countByPostIds(postIds).stream()
                .collect(Collectors.toMap(LikeCountProjection::getTargetId, LikeCountProjection::getLikeCount));
    }

    private Map<Long, Long> getCommentLikeCounts(List<Long> commentIds) {
        if (commentIds.isEmpty()) {
            return Map.of();
        }
        return commentLikeRepository.countByCommentIds(commentIds).stream()
                .collect(Collectors.toMap(LikeCountProjection::getTargetId, LikeCountProjection::getLikeCount));
    }

    private void validateOwner(Post post, String sessionId) {
        if (!post.isOwnedBy(sessionId)) {
            throw new ForbiddenOperationException("본인이 작성한 글만 수정하거나 삭제할 수 있습니다.");
        }
    }

    private void validateContent(String content) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("내용을 입력해주세요.");
        }
    }

    private String normalizeNickname(String nickname) {
        if (nickname == null || nickname.isBlank()) {
            return DEFAULT_NICKNAME;
        }
        return nickname.trim();
    }
}
