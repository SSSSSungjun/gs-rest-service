package com.example.restservice.dto.response;

import com.example.restservice.entity.PollOption;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class PollOptionResponseDto {
    private Long id;
    private String content;
    private long voteCount;
    private boolean votedByMe;

    public static PollOptionResponseDto from(PollOption pollOption, long voteCount, boolean votedByMe) {
        return PollOptionResponseDto.builder()
                .id(pollOption.getId())
                .content(pollOption.getContent())
                .voteCount(voteCount)
                .votedByMe(votedByMe)
                .build();
    }
}
