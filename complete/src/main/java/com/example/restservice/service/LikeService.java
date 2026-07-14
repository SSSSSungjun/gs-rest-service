package com.example.restservice.service;

import com.example.restservice.entity.Comment;
import com.example.restservice.entity.CommentLike;
import com.example.restservice.entity.Post;
import com.example.restservice.entity.PostLike;
import com.example.restservice.exception.ResourceNotFoundException;
import com.example.restservice.repository.CommentLikeRepository;
import com.example.restservice.repository.CommentRepository;
import com.example.restservice.repository.PostLikeRepository;
import com.example.restservice.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LikeService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final PostLikeRepository postLikeRepository;
    private final CommentLikeRepository commentLikeRepository;

    @Transactional
    public void togglePostLike(Long postId, String sessionId) {
        Post post = postRepository.findWithLockById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("삭제되었거나 존재하지 않는 글입니다."));
        postLikeRepository.findByPostIdAndOwnerSessionId(postId, sessionId)
                .ifPresentOrElse(
                        postLikeRepository::delete,
                        () -> createPostLike(post, sessionId)
                );
    }

    @Transactional
    public void toggleCommentLike(Long commentId, String sessionId) {
        Comment comment = commentRepository.findWithLockById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("삭제되었거나 존재하지 않는 댓글입니다."));
        commentLikeRepository.findByCommentIdAndOwnerSessionId(commentId, sessionId)
                .ifPresentOrElse(
                        commentLikeRepository::delete,
                        () -> createCommentLike(comment, sessionId)
                );
    }

    private void createPostLike(Post post, String sessionId) {
        postLikeRepository.save(PostLike.builder()
                .post(post)
                .ownerSessionId(sessionId)
                .build());
    }

    private void createCommentLike(Comment comment, String sessionId) {
        commentLikeRepository.save(CommentLike.builder()
                .comment(comment)
                .ownerSessionId(sessionId)
                .build());
    }
}