package com.example.restservice.dto.response;

import com.example.restservice.entity.Post;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Builder
@AllArgsConstructor
public class PostResponseDto {
    private Long id;
    private String nickname;
    private String content;
    private LocalDateTime createdAt;

    public static PostResponseDto from(Post post) {
        return PostResponseDto.builder()
                .id(post.getId())
                .nickname(post.getNickname())
                .content(post.getContent())
                .createdAt(post.getCreatedAt())
                .build();
    }
}