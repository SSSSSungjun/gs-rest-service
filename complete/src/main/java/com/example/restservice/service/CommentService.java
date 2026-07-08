package com.example.restservice.service;

import com.example.restservice.dto.request.CommentRequestDto;
import com.example.restservice.dto.response.CommentResponseDto;
import com.example.restservice.entity.Comment;
import com.example.restservice.entity.Post;
import com.example.restservice.exception.ForbiddenOperationException;
import com.example.restservice.repository.CommentRepository;
import com.example.restservice.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentService {
    private static final String DEFAULT_NICKNAME = "익명";

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;

    @Transactional
    public CommentResponseDto createComment(Long postId, CommentRequestDto requestDto, String sessionId) {
        validateContent(requestDto.getContent());

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 글입니다."));

        Comment comment = Comment.builder()
                .post(post)
                .nickname(normalizeNickname(requestDto.getNickname()))
                .content(requestDto.getContent().trim())
                .ownerSessionId(sessionId)
                .build();

        return CommentResponseDto.from(commentRepository.save(comment), sessionId);
    }

    @Transactional
    public void deleteComment(Long commentId, String sessionId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 댓글입니다."));

        if (!comment.isOwnedBy(sessionId)) {
            throw new ForbiddenOperationException("본인이 작성한 댓글만 삭제할 수 있습니다.");
        }

        commentRepository.delete(comment);
    }

    private void validateContent(String content) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("댓글 내용을 입력해주세요.");
        }
    }

    private String normalizeNickname(String nickname) {
        if (nickname == null || nickname.isBlank()) {
            return DEFAULT_NICKNAME;
        }
        return nickname.trim();
    }
}
