package com.example.restservice.dto.response;

import com.example.restservice.entity.Comment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
@AllArgsConstructor
public class CommentResponseDto {
    private Long id;
    private String nickname;
    private String content;
    private boolean ownedByMe;
    private long likeCount;
    private boolean likedByMe;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static CommentResponseDto from(Comment comment, String sessionId) {
        return from(comment, sessionId, 0, false);
    }

    public static CommentResponseDto from(Comment comment, String sessionId, long likeCount, boolean likedByMe) {
        return CommentResponseDto.builder()
                .id(comment.getId())
                .nickname(comment.getNickname())
                .content(comment.getContent())
                .ownedByMe(comment.isOwnedBy(sessionId))
                .likeCount(likeCount)
                .likedByMe(likedByMe)
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }
}
