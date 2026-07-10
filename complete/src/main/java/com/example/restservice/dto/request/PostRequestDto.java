package com.example.restservice.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostRequestDto {
    @Size(max = 40, message = "닉네임은 40자 이하로 입력해주세요.")
    private String nickname;

    @NotBlank(message = "내용을 입력해주세요.")
    @Size(max = 2000, message = "내용은 2000자 이하로 입력해주세요.")
    private String content;

    @Builder.Default
    @Size(max = 10, message = "이미지는 최대 10장까지 첨부할 수 있습니다.")
    private List<@Valid PostImageRequestDto> images = new ArrayList<>();

    @Size(max = 5, message = "투표 선택지는 최대 5개까지 만들 수 있습니다.")
    private List<@Size(max = 80, message = "투표 선택지는 80자 이하로 입력해주세요.") String> pollOptions;

    private boolean showImagesInContent;
}
