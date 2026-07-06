package com.example.restservice.dto.request;

import lombok.*;

@Getter
@Setter 
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostRequestDto {
    private String nickname;
    private String content;
    private String anonymousToken;
}
