package com.example.restservice.dto.response;

import com.example.restservice.entity.Post;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Getter
@Builder
@AllArgsConstructor
public class PostResponseDto {
    private Long id;
    private String nickname;
    private String content;
    private boolean ownedByMe;
    private long likeCount;
    private boolean likedByMe;
    private boolean showImagesInContent;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<PostImageResponseDto> images;
    private List<CommentResponseDto> comments;

    public static PostResponseDto from(Post post, String sessionId) {
        return from(post, sessionId, 0, false, Map.of(), Set.of());
    }

    public static PostResponseDto from(
            Post post,
            String sessionId,
            long likeCount,
            boolean likedByMe,
            Map<Long, Long> commentLikeCounts,
            Set<Long> likedCommentIds
    ) {
        return PostResponseDto.builder()
                .id(post.getId())
                .nickname(post.getNickname())
                .content(post.getContent())
                .ownedByMe(post.isOwnedBy(sessionId))
                .likeCount(likeCount)
                .likedByMe(likedByMe)
                .showImagesInContent(post.isShowImagesInContent())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .images(post.getImages().stream()
                        .map(PostImageResponseDto::from)
                        .toList())
                .comments(post.getComments().stream()
                        .map(comment -> CommentResponseDto.from(
                                comment,
                                sessionId,
                                commentLikeCounts.getOrDefault(comment.getId(), 0L),
                                likedCommentIds.contains(comment.getId())
                        ))
                        .toList())
                .build();
    }
}
