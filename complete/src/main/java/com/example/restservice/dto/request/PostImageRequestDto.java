package com.example.restservice.dto.request;

import com.example.restservice.entity.PostImage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostImageRequestDto {
    @NotNull(message = "이미지 종류를 선택해주세요.")
    private PostImage.SourceType sourceType;

    @NotBlank(message = "이미지 URL을 입력해주세요.")
    @Size(max = 2048, message = "이미지 URL은 2048자 이하로 입력해주세요.")
    private String url;

    @Size(max = 255, message = "파일명은 255자 이하로 입력해주세요.")
    private String originalFilename;
}
