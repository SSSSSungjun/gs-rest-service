package com.example.restservice.service;

import com.example.restservice.dto.request.CommentRequestDto;
import com.example.restservice.dto.response.CommentResponseDto;
import com.example.restservice.entity.Comment;
import com.example.restservice.entity.Post;
import com.example.restservice.exception.ForbiddenOperationException;
import com.example.restservice.exception.ResourceNotFoundException;
import com.example.restservice.repository.CommentLikeRepository;
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
    private final CommentLikeRepository commentLikeRepository;

    @Transactional
    public CommentResponseDto createComment(Long postId, CommentRequestDto requestDto, String sessionId) {
        validateContent(requestDto.getContent());

        Post post = postRepository.findWithLockById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("삭제되었거나 존재하지 않는 글입니다."));
        Comment parentComment = findParentComment(post, requestDto.getParentCommentId());

        Comment comment = Comment.builder()
                .post(post)
                .parentComment(parentComment)
                .nickname(normalizeNickname(requestDto.getNickname()))
                .content(requestDto.getContent().trim())
                .ownerSessionId(sessionId)
                .build();

        return CommentResponseDto.from(commentRepository.save(comment), sessionId);
    }

    @Transactional
    public CommentResponseDto updateComment(Long commentId, CommentRequestDto requestDto, String sessionId) {
        validateContent(requestDto.getContent());

        Comment comment = commentRepository.findWithLockById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("삭제되었거나 존재하지 않는 댓글입니다."));
        validateOwner(comment, sessionId);

        comment.update(normalizeNickname(requestDto.getNickname()), requestDto.getContent().trim());
        return CommentResponseDto.from(comment, sessionId);
    }

    @Transactional
    public void deleteComment(Long commentId, String sessionId) {
        Comment comment = commentRepository.findWithLockById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("삭제되었거나 존재하지 않는 댓글입니다."));
        validateOwner(comment, sessionId);

        commentRepository.findByParentCommentId(commentId)
                .forEach(Comment::clearParentComment);
        commentLikeRepository.deleteByCommentId(commentId);
        commentRepository.delete(comment);
    }

    private Comment findParentComment(Post post, Long parentCommentId) {
        if (parentCommentId == null) {
            return null;
        }

        Comment parentComment = commentRepository.findWithLockById(parentCommentId)
                .orElseThrow(() -> new ResourceNotFoundException("삭제되었거나 존재하지 않는 댓글입니다."));
        if (!parentComment.getPost().getId().equals(post.getId())) {
            throw new IllegalArgumentException("같은 글의 댓글에만 답글을 남길 수 있습니다.");
        }
        return parentComment;
    }

    private void validateOwner(Comment comment, String sessionId) {
        if (!comment.isOwnedBy(sessionId)) {
            throw new ForbiddenOperationException("본인이 작성한 댓글만 수정하거나 삭제할 수 있습니다.");
        }
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