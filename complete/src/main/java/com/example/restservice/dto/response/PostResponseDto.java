package com.example.restservice.dto.response;

import com.example.restservice.entity.Post;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class PostResponseDto {
    private Long id;
    private String nickname;
    private String content;
    private boolean ownedByMe;
    private LocalDateTime createdAt;
    private List<CommentResponseDto> comments;

    public static PostResponseDto from(Post post, String sessionId) {
        return PostResponseDto.builder()
                .id(post.getId())
                .nickname(post.getNickname())
                .content(post.getContent())
                .ownedByMe(post.isOwnedBy(sessionId))
                .createdAt(post.getCreatedAt())
                .comments(post.getComments().stream()
                        .map(comment -> CommentResponseDto.from(comment, sessionId))
                        .toList())
                .build();
    }
}
