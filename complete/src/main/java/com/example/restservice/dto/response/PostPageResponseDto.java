package com.example.restservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class PostPageResponseDto {
    private List<PostResponseDto> posts;
    private List<CommentSearchResultResponseDto> commentResults;
    private long totalElements;
    private int totalPages;
    private int page;
    private int size;

    public static PostPageResponseDto of(
            List<PostResponseDto> posts,
            List<CommentSearchResultResponseDto> commentResults,
            long totalElements,
            int totalPages,
            int page,
            int size
    ) {
        return PostPageResponseDto.builder()
                .posts(posts)
                .commentResults(commentResults)
                .totalElements(totalElements)
                .totalPages(Math.max(1, totalPages))
                .page(page)
                .size(size)
                .build();
    }
}
