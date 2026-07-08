package com.example.restservice.service;

import com.example.restservice.entity.Comment;
import com.example.restservice.entity.CommentLike;
import com.example.restservice.entity.Post;
import com.example.restservice.entity.PostLike;
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
        postLikeRepository.findByPostIdAndOwnerSessionId(postId, sessionId)
                .ifPresentOrElse(
                        postLikeRepository::delete,
                        () -> createPostLike(postId, sessionId)
                );
    }

    @Transactional
    public void toggleCommentLike(Long commentId, String sessionId) {
        commentLikeRepository.findByCommentIdAndOwnerSessionId(commentId, sessionId)
                .ifPresentOrElse(
                        commentLikeRepository::delete,
                        () -> createCommentLike(commentId, sessionId)
                );
    }

    private void createPostLike(Long postId, String sessionId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 글입니다."));
        postLikeRepository.save(PostLike.builder()
                .post(post)
                .ownerSessionId(sessionId)
                .build());
    }

    private void createCommentLike(Long commentId, String sessionId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 댓글입니다."));
        commentLikeRepository.save(CommentLike.builder()
                .comment(comment)
                .ownerSessionId(sessionId)
                .build());
    }
}
