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
    private LocalDateTime createdAt;

    public static CommentResponseDto from(Comment comment, String sessionId) {
        return CommentResponseDto.builder()
                .id(comment.getId())
                .nickname(comment.getNickname())
                .content(comment.getContent())
                .ownedByMe(comment.isOwnedBy(sessionId))
                .createdAt(comment.getCreatedAt())
                .build();
    }
}
