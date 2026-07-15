package com.example.restservice.dto.response;

import com.example.restservice.entity.Comment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class CommentSearchResultResponseDto {
    private Long postId;
    private String postContent;
    private CommentResponseDto comment;

    public static CommentSearchResultResponseDto from(
            Comment comment,
            String sessionId,
            long likeCount,
            boolean likedByMe
    ) {
        return CommentSearchResultResponseDto.builder()
                .postId(comment.getPost().getId())
                .postContent(comment.getPost().getContent())
                .comment(CommentResponseDto.from(comment, sessionId, likeCount, likedByMe))
                .build();
    }
}
