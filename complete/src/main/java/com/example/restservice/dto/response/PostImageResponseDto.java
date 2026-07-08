package com.example.restservice.dto.response;

import com.example.restservice.entity.PostImage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class PostImageResponseDto {
    private Long id;
    private PostImage.SourceType sourceType;
    private String url;
    private String originalFilename;
    private int imageOrder;

    public static PostImageResponseDto from(PostImage image) {
        return PostImageResponseDto.builder()
                .id(image.getId())
                .sourceType(image.getSourceType())
                .url(image.getUrl())
                .originalFilename(image.getOriginalFilename())
                .imageOrder(image.getImageOrder())
                .build();
    }
}
